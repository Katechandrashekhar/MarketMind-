const http = require("node:http");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.FINNHUB_API_KEY;
const DASHBOARD_PATH = path.join(__dirname, "stock-analysis.html");
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const MAX_CANDLE_RANGE_SECONDS = 6 * 366 * 24 * 60 * 60;

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(payload));
}

function validSymbol(value) {
  return typeof value === "string" && /^[A-Z0-9.^_-]{1,12}$/.test(value);
}

async function requestFinnhub(endpoint, params) {
  const url = new URL(FINNHUB_BASE_URL + endpoint);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  url.searchParams.set("token", API_KEY);

  const upstream = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!upstream.ok) {
    throw new Error("Finnhub returned HTTP " + upstream.status);
  }

  const payload = await upstream.json();
  if (!payload || payload.error || (endpoint.endsWith("/candle") && payload.s !== "ok")) {
    throw new Error("Finnhub did not return valid market data");
  }
  return payload;
}

async function handleApi(request, response, url) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Only GET requests are supported." });
    return;
  }
  if (!API_KEY) {
    sendJson(response, 503, { error: "Set FINNHUB_API_KEY in your local .env file." });
    return;
  }

  const symbol = url.searchParams.get("symbol");
  if (!validSymbol(symbol)) {
    sendJson(response, 400, { error: "Provide a valid market symbol." });
    return;
  }

  if (url.pathname === "/api/quote") {
    const payload = await requestFinnhub("/quote", { symbol });
    sendJson(response, 200, payload);
    return;
  }

  if (url.pathname === "/api/candles") {
    const resolution = url.searchParams.get("resolution");
    const from = Number(url.searchParams.get("from"));
    const to = Number(url.searchParams.get("to"));
    if (
      resolution !== "D" ||
      !Number.isSafeInteger(from) ||
      !Number.isSafeInteger(to) ||
      from <= 0 ||
      to <= from ||
      to - from > MAX_CANDLE_RANGE_SECONDS
    ) {
      sendJson(response, 400, { error: "Provide a valid daily candle range of six years or less." });
      return;
    }

    const payload = await requestFinnhub("/stock/candle", {
      symbol,
      resolution,
      from,
      to
    });
    sendJson(response, 200, payload);
    return;
  }

  sendJson(response, 404, { error: "API route not found." });
}

const server = http.createServer(async (request, response) => {
  let url;
  try {
    url = new URL(request.url, "http://" + HOST);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }
    if (url.pathname !== "/" && url.pathname !== "/stock-analysis.html") {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const html = await readFile(DASHBOARD_PATH);
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    });
    response.end(request.method === "HEAD" ? undefined : html);
  } catch (error) {
    console.error("Request failed:", error.message);
    if (response.headersSent) {
      response.destroy();
    } else if (url && url.pathname.startsWith("/api/")) {
      sendJson(response, 502, { error: "Market data request failed. Check the server log and Finnhub configuration." });
    } else {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Unable to load the dashboard.");
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log("MarketMind is available at http://" + HOST + ":" + PORT);
  if (!API_KEY) {
    console.warn("FINNHUB_API_KEY is not set; live data endpoints will return 503.");
  }
});
