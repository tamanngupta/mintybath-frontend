import { useEffect, useState } from "react";
import { fetchStocks, fetchStock, fetchCandles, placeTrade } from "./lib/api";
import type { Stock, Candle, TradeOutcome } from "./lib/api";
import { CandleChart } from "./components/CandleChart";

export default function App() {
  const [playerId, setPlayerId] = useState("");
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selected, setSelected] = useState<Stock | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [lastOutcome, setLastOutcome] = useState<TradeOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load the stock list once on mount.
  useEffect(() => {
    fetchStocks()
      .then(setStocks)
      .catch(() => setError("Couldn't load stocks — is the server running?"));
  }, []);

  // Keep the sidebar prices live too, independent of whatever's selected.
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStocks().then(setStocks).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  async function selectStock(stock: Stock) {
    setSelected(stock);
    setLastOutcome(null);
    setError(null);
    try {
      const freshCandles = await fetchCandles(stock.id);
      setCandles(freshCandles);
    } catch {
      setError("Couldn't load price history for this stock.");
    }
  }

  async function refreshSelected() {
    if (!selected) return;
    const [freshStock, freshCandles] = await Promise.all([
      fetchStock(selected.id),
      fetchCandles(selected.id),
    ]);
    setSelected(freshStock);
    setCandles(freshCandles);
    setStocks((prev) => prev.map((s) => (s.id === freshStock.id ? freshStock : s)));
  }

  // Poll for new trades while a stock is open. Keyed on selected?.id (not
  // `selected` itself) so the interval doesn't get torn down and rebuilt
  // every single time price updates — only when you actually switch stocks.
  useEffect(() => {
    if (!selected?.id) return;
    const id = selected.id;

    const interval = setInterval(async () => {
      try {
        const [freshStock, freshCandles] = await Promise.all([
          fetchStock(id),
          fetchCandles(id),
        ]);
        setSelected(freshStock);
        setCandles(freshCandles);
        setStocks((prev) => prev.map((s) => (s.id === freshStock.id ? freshStock : s)));
      } catch {
        // silent — a single missed poll isn't worth surfacing an error for
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [selected?.id]);

  async function handleTrade(action: "BUY" | "SELL" | "HOLD") {
    if (!playerId) {
      setError("Enter your player ID first.");
      return;
    }
    if (!selected) return;

    setLoading(true);
    setError(null);
    try {
      const outcome = await placeTrade(playerId, selected.id, action);
      setLastOutcome(outcome);
      await refreshSelected();
    } catch {
      setError("Trade failed — check your player ID and that the server's running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-[#e8f5ee] px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">MintyBath</h1>
        <p className="text-sm text-[#7fa896] mb-6">simulated markets</p>

        <input
          className="w-full max-w-xs bg-[#111a16] border border-[#1f2e27] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3ddc97] transition-colors mb-8"
          placeholder="Player ID"
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
        />

        <div className="grid md:grid-cols-[220px_1fr] gap-6">
          {/* Stock list */}
          <div className="space-y-2">
            {stocks.map((stock) => (
              <button
                key={stock.id}
                onClick={() => selectStock(stock)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  selected?.id === stock.id
                    ? "border-[#3ddc97] bg-[#111a16]"
                    : "border-[#1f2e27] bg-[#0d1512] hover:bg-[#111a16]"
                }`}
              >
                <div className="text-sm font-medium">{stock.ticker}</div>
                <div className="text-xs text-[#7fa896]">${stock.currentPrice.toFixed(2)}</div>
              </button>
            ))}
          </div>

          {/* Selected stock detail */}
          <div>
            {!selected && <p className="text-sm text-[#7fa896]">Pick a stock to start trading.</p>}

            {selected && (
              <>
                <div className="mb-4">
                  <div className="text-xs text-[#7fa896] uppercase tracking-wide">
                    {selected.ticker} · {selected.name}
                  </div>
                  <div className="font-mono text-3xl tabular-nums">
                    ${selected.currentPrice.toFixed(2)}
                  </div>
                </div>

                <CandleChart candles={candles} />

                <div className="grid grid-cols-3 gap-3 mt-6 mb-4">
                  <button
                    disabled={loading}
                    onClick={() => handleTrade("BUY")}
                    className="py-3 rounded-lg bg-[#3ddc97] text-[#0a0f0d] font-medium text-sm hover:brightness-110 transition disabled:opacity-40"
                  >
                    Buy
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => handleTrade("SELL")}
                    className="py-3 rounded-lg bg-[#e5735f] text-[#0a0f0d] font-medium text-sm hover:brightness-110 transition disabled:opacity-40"
                  >
                    Sell
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => handleTrade("HOLD")}
                    className="py-3 rounded-lg bg-[#1f2e27] text-[#e8f5ee] font-medium text-sm hover:bg-[#28382f] transition disabled:opacity-40"
                  >
                    Hold
                  </button>
                </div>

                {lastOutcome && (
                  <div
                    className={`text-sm rounded-lg px-4 py-3 border ${
                      lastOutcome.outcome === "win"
                        ? "border-[#3ddc97] text-[#3ddc97]"
                        : lastOutcome.outcome === "loss"
                        ? "border-[#e5735f] text-[#e5735f]"
                        : "border-[#1f2e27] text-[#7fa896]"
                    }`}
                  >
                    {lastOutcome.outcome === "held"
                      ? "Position held — no call made."
                      : lastOutcome.outcome === "win"
                      ? `Nice — ${lastOutcome.ticker} moved ${lastOutcome.priceChangePercent.toFixed(2)}% in your favor.`
                      : `Missed it — ${lastOutcome.ticker} moved ${lastOutcome.priceChangePercent.toFixed(2)}% against your call.`}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-[#e5735f] mt-6">{error}</p>}
      </div>
    </div>
  );
}