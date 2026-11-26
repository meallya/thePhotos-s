import test from "node:test";
import assert from "node:assert/strict";
import { createEmailHandler } from "../api/email.js";
import {
  DeliveryError,
  MAX_IMAGE_BYTES,
  readPngBody,
  validateEmailRecipient,
  validateWhatsAppRecipient,
} from "../src/server/delivery.js";
import { createWhatsAppHandler } from "../api/whatsapp.js";
import {
  normalizeEmailAddress,
  normalizeWhatsAppNumber,
} from "../src/lib/deliveryValidation.js";

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
function createRequest({ method = "POST", recipient, image = png, headers = {} } = {}) {
  const requestHeaders = {
    "content-type": "image/png",
    "x-photo-recipient": recipient,
    ...headers,
  };
  return {
    method,
    headers: requestHeaders,
    async *[Symbol.asyncIterator]() {
      yield image;
    },
  };
}

function createResponse() {
  return {
    headers: {},
    statusCode: 0,
    body: null,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

const whatsappEnv = {
  PHOTO_DELIVERY_ENABLED: "true",
  META_WHATSAPP_ACCESS_TOKEN: "server-token",
  META_WHATSAPP_PHONE_NUMBER_ID: "123456789",
  META_WHATSAPP_API_VERSION: "v22.0",
};

const smtpEnv = {
  PHOTO_DELIVERY_ENABLED: "true",
  SMTP_HOST: "smtp.example.test",
  SMTP_PORT: "587",
  SMTP_SECURE: "false",
  SMTP_USER: "smtp-user",
  SMTP_PASS: "server-password",
  SMTP_FROM: "ThePhoto's <photos@example.test>",
};

test("delivery recipients are normalized and reject malformed input", () => {
  assert.equal(normalizeWhatsAppNumber("+1 (415) 555-0100"), "+14155550100");
  assert.equal(validateWhatsAppRecipient("+1 (415) 555-0100"), "+14155550100");
  assert.equal(normalizeWhatsAppNumber("4155550100"), "");
  assert.throws(() => validateWhatsAppRecipient("+123"), DeliveryError);
  assert.equal(normalizeEmailAddress("  photo@example.test "), "photo@example.test");
  assert.equal(validateEmailRecipient("photo@example.test"), "photo@example.test");
  assert.equal(normalizeEmailAddress("photo@example"), "");
  assert.throws(() => validateEmailRecipient("photo@example.test\r\nBcc:spam"), DeliveryError);
});

test("PNG body reader rejects non-PNG and over-limit files", async () => {
  await assert.rejects(
    readPngBody(
      createRequest({ image: Buffer.from("not a png") }),
    ),
    (error) => error instanceof DeliveryError && error.status === 400,
  );
  await assert.rejects(
    readPngBody(
      createRequest({
        headers: { "content-length": String(MAX_IMAGE_BYTES + 1) },
      }),
    ),
    (error) => error instanceof DeliveryError && error.status === 413,
  );
});

test("WhatsApp POST stays disabled even with enabled environment and provider credentials", async () => {
  let dependencyCalls = 0;
  let bodyRead = false;
  const request = createRequest({ recipient: "+14155550100" });
  request[Symbol.asyncIterator] = async function* () {
    bodyRead = true;
    yield png;
  };
  const handler = createWhatsAppHandler({
    env: whatsappEnv,
    rateLimit: async () => { dependencyCalls += 1; return { success: true }; },
    fetchImpl: async () => { dependencyCalls += 1; return { ok: true, json: async () => ({}) }; },
  });
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 410);
  assert.match(response.body.error, /disabled for this release/i);
  assert.equal(bodyRead, false);
  assert.equal(dependencyCalls, 0);
});

test("email POST stays disabled even with enabled environment and SMTP credentials", async () => {
  let dependencyCalls = 0;
  let bodyRead = false;
  const request = createRequest({ recipient: "photo@example.test" });
  request[Symbol.asyncIterator] = async function* () {
    bodyRead = true;
    yield png;
  };
  const handler = createEmailHandler({
    env: smtpEnv,
    rateLimit: async () => { dependencyCalls += 1; return { success: true }; },
    createTransport: () => { dependencyCalls += 1; return { sendMail: async () => ({}) }; },
  });
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 410);
  assert.match(response.body.error, /disabled for this release/i);
  assert.equal(bodyRead, false);
  assert.equal(dependencyCalls, 0);
});

test("delivery endpoints only accept POST requests", async () => {
  const handler = createEmailHandler({ env: smtpEnv });
  const response = createResponse();

  await handler(createRequest({ method: "GET" }), response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.allow, "POST");
});

