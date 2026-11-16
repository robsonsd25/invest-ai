"use client";

import { useEffect, useState, useRef } from "react";
import { getLivePrices, LiveQuote } from "@/lib/api";

export function useLivePrices(tickers: string[], intervalMs: number = 120000) {
  const [prices, setPrices] = useState<Record<string, LiveQuote>>({});
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);
  const tickersKey = [...tickers].sort().join(",");

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (tickers.length === 0) return;

    const fetchPrices = async () => {
      setIsLoading(true);
      try {
        const data = await getLivePrices(tickers);
        if (mountedRef.current) {
          setPrices(data.quotes);
          setLastUpdate(new Date(data.timestamp));
        }
      } catch (err) {
        console.error("[useLivePrices]", err);
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, intervalMs);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickersKey, intervalMs]);

  return { prices, lastUpdate, isLoading };
}

export function useElapsedTime(lastUpdate: Date | null) {
  const [, setNow] = useState(Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(tick);
  }, []);

  if (!lastUpdate) return null;
  return Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
}