# MarketMind stock dashboard

A responsive stock-analysis dashboard with demo data, a browser-saved watchlist, selectable chart ranges, RSI/MACD indicators, pasted-price analysis, moving-average backtests, and an optional Finnhub live-data connection.

## Requirements

- Node.js 20.6 or newer
- A Finnhub API key for live data

## Run locally

1. Copy `.env.example` to `.env`.
2. Set `FINNHUB_API_KEY` in `.env` to your own Finnhub API key.
3. Run `npm start`.
4. Open <http://127.0.0.1:3000>.
5. Select a symbol and choose **Load live data**.

The server reads `.env` locally, serves `stock-analysis.html`, and proxies the dashboard's market-data requests to Finnhub. The key stays on the server and is excluded from Git by `.gitignore`. Do not put API keys in the HTML or share them in chat.

## API routes

- `GET /api/quote?symbol=AAPL` returns Finnhub quote JSON.
- `GET /api/candles?symbol=AAPL&resolution=D&from=...&to=...` returns Finnhub daily candle JSON. The requested range must be no more than six years.

The proxy listens on `127.0.0.1` by default and accepts only symbols matching letters, digits, `.`, `^`, `_`, and `-`. For public deployment, add your hosting platform's HTTPS, access controls, and rate limiting; do not expose an unauthenticated proxy publicly.

## Demo and local data

The dashboard works without an API key in demo mode. You can also paste daily closing prices in `date,close` format and export the current prices as CSV.

The watchlist is stored in the browser's local storage. Chart range buttons filter the chart display; the strategy backtest continues to use the full loaded history. RSI uses a 14-session Wilder calculation, and MACD uses the 12/26/9 convention.

This tool is for educational purposes only and is not financial advice.
