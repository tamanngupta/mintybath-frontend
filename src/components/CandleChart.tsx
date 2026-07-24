import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, ColorType, type IChartApi } from "lightweight-charts";
import type { Candle } from "../lib/api";

type Props = {
  candles: Candle[];
};

export function CandleChart({ candles }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Create the chart once, on mount.
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0d1512" },
        textColor: "#7fa896",
      },
      grid: {
        vertLines: { color: "#1f2e27" },
        horzLines: { color: "#1f2e27" },
      },
      width: containerRef.current.clientWidth,
      height: 300,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#3ddc97",
      downColor: "#e5735f",
      borderVisible: false,
      wickUpColor: "#3ddc97",
      wickDownColor: "#e5735f",
    });

    chartRef.current = chart;
    (chart as any)._series = series; // stash so the next effect can reach it

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  // Push new candle data in whenever it changes.
  useEffect(() => {
    const chart = chartRef.current as any;
    if (!chart || !chart._series) return;

    const formatted = candles.map((c) => ({
      time: (new Date(c.timestamp).getTime() / 1000) as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    chart._series.setData(formatted);
  }, [candles]);

  return <div ref={containerRef} className="rounded-xl overflow-hidden border border-[#1f2e27]" />;
}
