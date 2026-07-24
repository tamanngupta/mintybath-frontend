const API_BASE = "http://localhost:3000";

// Public shapes only — no rating, no pressure. Matches what the API now sends.
export type Stock = {
  id: string;
  ticker: string;
  name: string;
  currentPrice: number;
};

export type Candle = {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: string;
};

export type TradeAction = "BUY" | "SELL" | "HOLD";

export type TradeOutcome = {
  ticker: string;
  action: TradeAction;
  newPrice: number;
  priceChangePercent: number;
  outcome: "win" | "loss" | "held";
};

export async function fetchStocks(): Promise<Stock[]> {
  const res = await fetch(`${API_BASE}/stocks`);
  if (!res.ok) throw new Error("Couldn't load stocks");
  return res.json();
}

export async function fetchStock(stockId: string): Promise<Stock> {
  const res = await fetch(`${API_BASE}/stock/${stockId}`);
  if (!res.ok) throw new Error("Stock not found");
  return res.json();
}

export async function fetchCandles(stockId: string): Promise<Candle[]> {
  const res = await fetch(`${API_BASE}/stock/${stockId}/candles`);
  if (!res.ok) throw new Error("Couldn't load candles");
  return res.json();
}

export async function placeTrade(
  playerId: string,
  stockId: string,
  action: TradeAction
): Promise<TradeOutcome> {
  const res = await fetch(`${API_BASE}/trade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId, stockId, action }),
  });
  if (!res.ok) throw new Error("Trade failed");
  return res.json();
}
