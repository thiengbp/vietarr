import test from "node:test";
import assert from "node:assert/strict";
import { ensureArrWebhook } from "../src/webhook.mjs";

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

test("webhook registration serializes custom headers as key-value pairs", async () => {
  let createdPayload;
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(input);
    if (url.pathname === "/api/v3/notification" && (options.method || "GET") === "GET") return json([]);
    if (url.pathname === "/api/v3/notification/schema") {
      return json([{
        implementation: "Webhook",
        configContract: "WebhookSettings",
        supportsOnGrab: true,
        supportsOnDownload: true,
        supportsOnUpgrade: true,
        fields: [
          { name: "url", value: null },
          { name: "method", value: 1 },
          { name: "headers", value: [] }
        ]
      }]);
    }
    if (url.pathname === "/api/v3/notification" && options.method === "POST") {
      createdPayload = JSON.parse(options.body);
      return json({ id: 9 }, 201);
    }
    throw new Error(`Unexpected request ${options.method || "GET"} ${url.pathname}`);
  };

  const result = await ensureArrWebhook({
    source: "Radarr",
    arr: { baseUrl: "http://radarr:7878", apiKey: "test-key" },
    webhookUrl: "https://api.vietarr.home.arpa/api/v1/webhook/arr",
    webhookSecret: "test-webhook-secret",
    fetchImpl
  });

  const headersField = createdPayload.fields.find((field) => field.name === "headers");
  assert.deepEqual(headersField.value, [{ key: "X-Vietarr-Webhook-Secret", value: "test-webhook-secret" }]);
  assert.deepEqual(result, { source: "Radarr", created: true, id: 9 });
});

