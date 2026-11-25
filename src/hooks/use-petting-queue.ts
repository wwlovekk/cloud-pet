"use client";
import { useCallback, useEffect, useRef } from "react";
import { usePetStore } from "@/store/pet-store";
import type { PetConfiguration, PetRegion } from "@/types/pet";
import type { PettingTelemetryRequest } from "@/types/api";

export const STATIC_MODE = process.env.NEXT_PUBLIC_STATIC_MODE === "1";
export function usePettingQueue(onGlobal: (count: string) => void) {
  const state = useRef({ start: 0, strokes: 0, distance: 0, regions: {} as Partial<Record<PetRegion, number>>, session: "", sequence: 0, configuration: null as PetConfiguration | null, petId: undefined as string | undefined });
  const queue = useRef<PettingTelemetryRequest[]>([]), sending = useRef(false), callback = useRef(onGlobal);
  callback.current = onGlobal;
  const drain = useCallback(async () => {
    if (STATIC_MODE || sending.current) return;
    sending.current = true;
    try {
      while (queue.current.length) {
        const item = queue.current[0]!;
        const r = await fetch("/api/telemetry/pet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item), keepalive: true });
        if (r.status >= 500 || r.status === 429) break;
        const result = await r.json();
        if (result.ok) callback.current(result.data.globalPettingCount);
        queue.current.shift();
      }
    } catch { /* Retry the same UUID/sequence after a network interruption. */ }
    finally { sending.current = false; }
  }, []);
  const flush = useCallback(() => {
    const b = state.current;
    if (!b.strokes) { b.start = 0; return; }
    const now = Date.now(), duration = Math.max(b.strokes * 100, Math.min(15_000, now - b.start)), c = b.configuration ?? usePetStore.getState().config;
    if (!STATIC_MODE) {
      if (!b.session) b.session = crypto.randomUUID();
      queue.current.push({ batchId: crypto.randomUUID(), sessionId: b.session, sequence: b.sequence++, ...(b.petId ? { petId: b.petId } : {}), species: c.species, breedId: c.breedId, view: c.view, durationMs: duration, strokeCount: b.strokes, distanceNormalized: b.distance, averageSpeed: Math.min(10, b.distance / (duration / 1000)), regionCounts: { ...b.regions }, clientStartedAt: new Date(now - duration).toISOString(), clientEndedAt: new Date(now).toISOString() });
      if (queue.current.length > 50) queue.current.shift();
    }
    b.start = 0; b.strokes = 0; b.distance = 0; b.regions = {}; b.configuration = null; b.petId = undefined;
    void drain();
  }, [drain]);
  const stroke = useCallback((region: PetRegion, distance: number, seconds: number) => {
    const b = state.current; if (!b.start) { b.start = Date.now(); b.configuration = { ...usePetStore.getState().config }; b.petId = usePetStore.getState().profile?.id; }
    b.strokes++; b.distance += distance; b.regions[region] = (b.regions[region] ?? 0) + 1;
    usePetStore.getState().stroke(seconds);
  }, []);
  useEffect(() => {
    const timer = setInterval(flush, 10_000);
    const visibility = () => { if (document.hidden) flush(); };
    window.addEventListener("pagehide", flush); document.addEventListener("visibilitychange", visibility); window.addEventListener("online", drain);
    return () => { clearInterval(timer); flush(); window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("online", drain); };
  }, [flush, drain]);
  return { stroke, flush };
}
