import crypto from "crypto";

export interface ConversionSettings {
  metaPixelId?: string | null;
  metaConversionToken?: string | null;
  googleTagId?: string | null;
  googleApiSecret?: string | null;
  tiktokPixelId?: string | null;
  tiktokAccessToken?: string | null;
}

export interface PurchaseEvent {
  orderId: string;
  value: number;
  currency: string;
  email?: string | null;
  phone?: string | null;
  clientIp?: string;
  userAgent?: string;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

async function fireMetaCapi(settings: ConversionSettings, event: PurchaseEvent): Promise<void> {
  if (!settings.metaPixelId || !settings.metaConversionToken) return;
  const url = `https://graph.facebook.com/v19.0/${settings.metaPixelId}/events?access_token=${settings.metaConversionToken}`;

  const userData: Record<string, string> = {};
  if (event.email) userData["em"] = sha256(event.email);
  if (event.phone) userData["ph"] = sha256(event.phone.replace(/\D/g, ""));
  if (event.clientIp) userData["client_ip_address"] = event.clientIp;
  if (event.userAgent) userData["client_user_agent"] = event.userAgent;

  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: event.orderId,
        action_source: "website",
        user_data: userData,
        custom_data: {
          value: event.value,
          currency: event.currency,
          order_id: event.orderId,
        },
      },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta CAPI error ${res.status}: ${text}`);
  }
}

async function fireGoogleMeasurementProtocol(settings: ConversionSettings, event: PurchaseEvent): Promise<void> {
  if (!settings.googleTagId || !settings.googleApiSecret) return;

  const measurementId = settings.googleTagId.startsWith("G-") ? settings.googleTagId : null;
  if (!measurementId) return;

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${settings.googleApiSecret}`;

  const payload = {
    client_id: event.orderId,
    events: [
      {
        name: "purchase",
        params: {
          transaction_id: event.orderId,
          value: event.value,
          currency: event.currency,
        },
      },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google MP error ${res.status}: ${text}`);
  }
}

async function fireTiktokEventsApi(settings: ConversionSettings, event: PurchaseEvent): Promise<void> {
  if (!settings.tiktokPixelId || !settings.tiktokAccessToken) return;

  const url = "https://business-api.tiktok.com/open_api/v1.3/event/track/";

  const properties: Record<string, unknown> = {
    contents: [{ content_id: event.orderId, content_type: "product", quantity: 1, price: event.value }],
    currency: event.currency,
    value: event.value,
    order_id: event.orderId,
  };

  const userProps: Record<string, string> = {};
  if (event.email) userProps["sha256_email"] = sha256(event.email);
  if (event.phone) userProps["sha256_phone_number"] = sha256(event.phone.replace(/\D/g, ""));

  const payload = {
    pixel_code: settings.tiktokPixelId,
    event: "CompletePayment",
    event_id: event.orderId,
    timestamp: new Date().toISOString(),
    context: {
      ip: event.clientIp ?? "0.0.0.0",
      user_agent: event.userAgent ?? "",
      user: userProps,
    },
    properties,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Token": settings.tiktokAccessToken,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TikTok Events API error ${res.status}: ${text}`);
  }
}

export async function firePurchaseConversions(
  settings: ConversionSettings,
  event: PurchaseEvent,
  logger?: { error: (obj: unknown, msg: string) => void }
): Promise<void> {
  const tasks = [
    fireMetaCapi(settings, event).catch((err) => logger?.error({ err }, "Meta CAPI failed")),
    fireGoogleMeasurementProtocol(settings, event).catch((err) => logger?.error({ err }, "Google MP failed")),
    fireTiktokEventsApi(settings, event).catch((err) => logger?.error({ err }, "TikTok Events API failed")),
  ];
  await Promise.allSettled(tasks);
}
