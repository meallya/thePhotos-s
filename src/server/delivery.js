import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  normalizeEmailAddress,
  normalizeWhatsAppNumber,
} from "../../src/lib/deliveryValidation.js";

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export class DeliveryError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "DeliveryError";
    this.status = status;
  }
}

export function sendJson(res, status, payload) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(payload);
}

export function rejectPhotoDelivery() {
  throw new DeliveryError(410, "Photo delivery is disabled for this release.");
}

export function validateWhatsAppRecipient(value) {
  const recipient = normalizeWhatsAppNumber(value);
  if (!recipient) {
    throw new DeliveryError(400, "Enter a valid WhatsApp number with country code.");
  }
  return recipient;
}

export function validateEmailRecipient(value) {
  const recipient = normalizeEmailAddress(value);
  if (!recipient) {
    throw new DeliveryError(400, "Enter a valid email address.");
  }
  return recipient;
}

function getClientIp(req) {
  const forwardedFor = req.headers?.["x-forwarded-for"];
  const forwardedValues = Array.isArray(forwardedFor)
    ? forwardedFor
    : typeof forwardedFor === "string"
      ? forwardedFor.split(",")
      : [];
  const forwardedIp = forwardedValues
    .map((value) => value.trim())
    .filter(Boolean)
    .pop();
  const realIp = req.headers?.["x-real-ip"];
  const socketIp = req.socket?.remoteAddress;
  return forwardedIp || (typeof realIp === "string" ? realIp.trim() : "") || socketIp;
}

let cachedLimiter;
let cachedRedisUrl;
let cachedRedisToken;

async function checkDeliveryRateLimit(req, env) {
  const redisUrl = env.UPSTASH_REDIS_REST_URL;
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) {
    throw new DeliveryError(
      503,
      "Secure photo delivery is not configured yet. Please try again later.",
    );
  }

  const clientIp = getClientIp(req);
  if (!clientIp) {
    throw new DeliveryError(
      503,
      "Secure photo delivery is temporarily unavailable. Please try again later.",
    );
  }

  if (
    !cachedLimiter ||
    cachedRedisUrl !== redisUrl ||
    cachedRedisToken !== redisToken
  ) {
    cachedRedisUrl = redisUrl;
    cachedRedisToken = redisToken;
    cachedLimiter = new Ratelimit({
      redis: new Redis({ url: redisUrl, token: redisToken }),
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: false,
      prefix: "thephotos:delivery",
    });
  }

  const identifier = createHash("sha256").update(clientIp).digest("hex");
  try {
    return await cachedLimiter.limit(identifier);
  } catch {
    throw new DeliveryError(
      503,
      "Secure photo delivery is temporarily unavailable. Please try again later.",
    );
  }
}

export async function enforceDeliveryRateLimit(req, env = process.env) {
  return checkDeliveryRateLimit(req, env);
}

export async function readPngBody(req) {
  const contentType = req.headers?.["content-type"];
  if (
    typeof contentType !== "string" ||
    contentType.split(";")[0].trim().toLowerCase() !== "image/png"
  ) {
    throw new DeliveryError(415, "The exported image must be a PNG.");
  }

  const contentLength = Number(req.headers?.["content-length"]);
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
    throw new DeliveryError(
      413,
      "This PNG is too large to send directly. Download it instead.",
    );
  }

  let image;
  if (Buffer.isBuffer(req.body)) {
    image = req.body;
  } else if (req.body instanceof Uint8Array) {
    image = Buffer.from(req.body);
  } else if (typeof req[Symbol.asyncIterator] === "function") {
    const chunks = [];
    let totalBytes = 0;
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.length;
      if (totalBytes > MAX_IMAGE_BYTES) {
        throw new DeliveryError(
          413,
          "This PNG is too large to send directly. Download it instead.",
        );
      }
      chunks.push(buffer);
    }
    image = Buffer.concat(chunks, totalBytes);
  } else {
    throw new DeliveryError(400, "The exported PNG could not be read.");
  }

  if (image.length > MAX_IMAGE_BYTES) {
    throw new DeliveryError(
      413,
      "This PNG is too large to send directly. Download it instead.",
    );
  }
  if (
    image.length < PNG_SIGNATURE.length ||
    !image.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  ) {
    throw new DeliveryError(400, "The uploaded file is not a valid PNG.");
  }

  return image;
}

export function getRecipientHeader(req) {
  const recipient = req.headers?.["x-photo-recipient"];
  if (Array.isArray(recipient)) {
    throw new DeliveryError(400, "Enter a valid recipient.");
  }
  return recipient;
}

export function handleDeliveryError(res, error, providerName) {
  if (error instanceof DeliveryError) {
    if (error.status === 429 && error.reset) {
      res.setHeader(
        "Retry-After",
        String(Math.max(1, Math.ceil((error.reset - Date.now()) / 1000))),
      );
    }
    return sendJson(res, error.status, { ok: false, error: error.message });
  }

  console.error(`${providerName} photo delivery failed.`);
  return sendJson(res, 502, {
    ok: false,
    error: `${providerName} could not confirm delivery. Please try again or download the photo.`,
  });
}
