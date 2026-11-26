import nodemailer from "nodemailer";
import {
  DeliveryError,
  enforceDeliveryRateLimit,
  getRecipientHeader,
  handleDeliveryError,
  readPngBody,
  rejectPhotoDelivery,
  sendJson,
  validateEmailRecipient,
} from "../src/server/delivery.js";

export const config = { api: { bodyParser: false } };

function getSmtpConfig(env) {
  const port = Number(env.SMTP_PORT);
  const secure = env.SMTP_SECURE;
  if (
    !env.SMTP_HOST ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    (secure !== "true" && secure !== "false") ||
    !env.SMTP_USER ||
    !env.SMTP_PASS ||
    !env.SMTP_FROM ||
    /[\r\n]/.test(env.SMTP_FROM)
  ) {
    throw new DeliveryError(
      503,
      "Email delivery is not configured yet. Please try again later.",
    );
  }
  return {
    host: env.SMTP_HOST,
    port,
    secure: secure === "true",
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    from: env.SMTP_FROM,
  };
}

export function createEmailHandler({
  env = process.env,
  createTransport = nodemailer.createTransport,
  rateLimit = enforceDeliveryRateLimit,
} = {}) {
  return async function emailHandler(req, res) {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return sendJson(res, 405, { ok: false, error: "Method not allowed." });
    }

    try {
      rejectPhotoDelivery();
      const recipient = validateEmailRecipient(getRecipientHeader(req));
      const config = getSmtpConfig(env);
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
      const transporter = createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
      });
      const result = await transporter.sendMail({
        from: config.from,
        to: recipient,
        subject: "Your ThePhoto's photo keepsake",
        text: "Your finished ThePhoto's photo strip is attached.",
        attachments: [
          {
            filename: "thephotos.png",
            content: image,
            contentType: "image/png",
          },
        ],
      });
      const acceptedRecipients = Array.isArray(result.accepted)
        ? result.accepted.map((address) => String(address).toLowerCase())
        : [];
      if (
        !result.messageId ||
        !acceptedRecipients.includes(recipient.toLowerCase())
      ) {
        throw new Error("SMTP recipient acceptance was not confirmed.");
      }

      return sendJson(res, 200, {
        ok: true,
        message: "Your email provider accepted the photo for delivery.",
      });
    } catch (error) {
      return handleDeliveryError(res, error, "Email");
    }
  };
}

export default createEmailHandler();
