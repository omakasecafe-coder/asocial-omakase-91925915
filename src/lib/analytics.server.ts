type GaEvent = {
  name: string;
  params?: Record<string, unknown>;
};

function measurementId() {
  return process.env["GA4_MEASUREMENT_ID"] ?? process.env["VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY"] ?? "";
}

function apiSecret() {
  return process.env["GA4_MEASUREMENT_PROTOCOL_SECRET"] ?? process.env["GA4_API_SECRET"] ?? "";
}

export async function sendServerGaEvents(clientId: string, events: GaEvent[]) {
  const id = measurementId();
  const secret = apiSecret();
  if (!id || !secret) return { sent: false, reason: "ga4_measurement_protocol_not_configured" };

  try {
    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(id)}&api_secret=${encodeURIComponent(secret)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          non_personalized_ads: true,
          events,
        }),
      },
    );

    if (!response.ok) {
      return { sent: false, reason: `ga4_http_${response.status}` };
    }

    return { sent: true };
  } catch {
    return { sent: false, reason: "ga4_request_failed" };
  }
}

