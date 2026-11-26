import {
  DeliveryError,
  enforceDeliveryRateLimit,
  getRecipientHeader,
  handleDeliveryError,
  readPngBody,
  rejectPhotoDelivery,
  sendJson,
  validateWhatsAppRecipient,
} from "../src/server/delivery.js";

export const config = { api: { bodyParser: false } };

function getWhatsAppConfig(env) {
  const accessToken = env.META_WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = env.META_WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = env.META_WHATSAPP_API_VERSION;
  if (
    !accessToken ||
    !phoneNumberId ||
    !/^\d+$/.test(phoneNumberId) ||
    !apiVersion ||
    !/^v\d+\.\d+$/.test(apiVersion)
  ) {
    throw new DeliveryError(
      503,
      "WhatsApp delivery is not configured yet. Please try again later.",
    );
  }
  return { accessToken, phoneNumberId, apiVersion };
}

async function responseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function createWhatsAppHandler({
  env = process.env,
  fetchImpl = globalThis.fetch,
  rateLimit = enforceDeliveryRateLimit,
} = {}) {
  return async function whatsappHandler(req, res) {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return sendJson(res, 405, { ok: false, error: "Method not allowed." });
    }

    try {
      rejectPhotoDelivery();
      const recipient = validateWhatsAppRecipient(getRecipientHeader(req));
      const config = getWhatsAppConfig(env);
      const rateLimitResult = await rateLimit(req, env);
      if (!rateLimitResult.success) {
        const error = new DeliveryError(
          429,
          "Too many delivery attempts. Please wait a minute and try again.",
        );
        error.reset = rateLimitResult.reset;
        throw error;
      }

      const image = await readPngBody(req);
      const mediaForm = new FormData();
      mediaForm.set("messaging_product", "whatsapp");
      mediaForm.set(
        "file",
        new Blob([image], { type: "image/png" }),
        "thephotos.png",
      );

      const mediaResponse = await fetchImpl(
        `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/media`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${config.accessToken}` },
          body: mediaForm,
        },
      );
      const mediaResult = await responseJson(mediaResponse);
      if (!mediaResponse.ok || typeof mediaResult?.id !== "string") {
        throw new Error("WhatsApp media upload was not confirmed.");
      }

      const messageResponse = await fetchImpl(
        `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: recipient.slice(1),
            type: "image",
            image: { id: mediaResult.id },
          }),
        },
      );
      const messageResult = await responseJson(messageResponse);
      if (
        !messageResponse.ok ||
        typeof messageResult?.messages?.[0]?.id !== "string"
      ) {
        throw new Error("WhatsApp message delivery was not confirmed.");
      }

      return sendJson(res, 200, {
        ok: true,
        message: "WhatsApp accepted the photo for delivery.",
      });
    } catch (error) {
      return handleDeliveryError(res, error, "WhatsApp");
    }
  };
}

export default createWhatsAppHandler();
