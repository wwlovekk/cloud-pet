"use client";
import { useEffect, useRef } from "react";
import { PetWebGL } from "@/engine/rendering/PetWebGL";
import { ComfortAudio } from "@/engine/audio/ComfortAudio";
import { usePetStore } from "@/store/pet-store";
import { usePettingQueue } from "@/hooks/use-petting-queue";
import type { PetRegion } from "@/types/pet";
import { Hand } from "./Hand";

export function PetCanvas({ onActivity, onGlobal }: { onActivity: (active: boolean, region: PetRegion | null) => void; onGlobal: (count: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null), hand = useRef<HTMLDivElement>(null), renderer = useRef<PetWebGL | null>(null), audio = useRef<ComfortAudio | null>(null);
  const config = usePetStore(s => s.config), muted = usePetStore(s => s.muted), volume = usePetStore(s => s.volume);
  const { stroke, flush } = usePettingQueue(onGlobal);
  const pointer = useRef<{ id: number | null; x: number; y: number; time: number; distance: number; lastStroke: number; active: boolean }>({ id: null, x: 0, y: 0, time: 0, distance: 0, lastStroke: 0, active: false });
  const keyboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!canvas.current) return;
    renderer.current = new PetWebGL(canvas.current, usePetStore.getState().config);
    audio.current = new ComfortAudio();
    const release = () => { renderer.current?.release(); audio.current?.update(false, 0, null, usePetStore.getState().config.species); pointer.current.id = null; onActivity(false, null); if (hand.current) hand.current.style.opacity = "0"; flush(); };
    const hide = () => { if (document.hidden) { release(); audio.current?.suspend(); } };
    window.addEventListener("blur", release); document.addEventListener("visibilitychange", hide);
    return () => { window.removeEventListener("blur", release); document.removeEventListener("visibilitychange", hide); if (keyboardTimer.current) clearTimeout(keyboardTimer.current); renderer.current?.destroy(); audio.current?.destroy(); renderer.current = null; audio.current = null; };
  // The engine owns a stable lifetime; changes are passed through update().
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { renderer.current?.update(config); }, [config]);
  useEffect(() => { audio.current?.preferences(muted, volume); }, [muted, volume]);
  useEffect(() => { void audio.current?.loadPack(config.breedId, config.species); }, [config.breedId, config.species]);
  const previousConfig = useRef(config);
  useEffect(() => { if (previousConfig.current.breedId !== config.breedId || previousConfig.current.view !== config.view) { flush(); onActivity(false, null); } previousConfig.current = config; }, [config, flush, onActivity]);
  async function unlock() { await audio.current?.unlock(); const s = usePetStore.getState(); audio.current?.preferences(s.muted, s.volume); void audio.current?.loadPack(s.config.breedId, s.config.species); }
  const move = (e: React.PointerEvent<HTMLCanvasElement>, down: boolean) => {
    const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height, p = pointer.current, now = performance.now();
    const distance = Math.hypot(x - p.x, (y - p.y) * r.height / r.width), seconds = Math.max(.016, (now - p.time) / 1000), speed = Math.min(10, distance / seconds);
    const region = renderer.current?.pointer({ x, y }, down) ?? null;
    if (hand.current) { const direction = Math.max(-14, Math.min(14, (x - p.x) * 450)); hand.current.style.transform = `translate3d(${e.clientX - r.left - 73}px,${e.clientY - r.top - 74}px,0) rotate(${direction - 12}deg) scale(${down ? .94 : 1})`; hand.current.style.opacity = e.pointerType === "mouse" || down ? "1" : "0"; }
    if (down && region) {
      p.distance += Math.min(.1, distance);
      if (p.distance >= .035 && now - p.lastStroke > 125) { stroke(region, p.distance, (now - p.lastStroke) / 1000); p.distance = 0; p.lastStroke = now; }
    }
    onActivity(down && !!region, region); audio.current?.update(down && !!region, speed, region, config.species);
    p.x = x; p.y = y; p.time = now; p.active = down && !!region;
  };
  const end = (e?: React.PointerEvent<HTMLCanvasElement>) => { if (e && pointer.current.id !== null && e.pointerId !== pointer.current.id) return; pointer.current.id = null; pointer.current.distance = 0; renderer.current?.release(); audio.current?.update(false, 0, null, config.species); onActivity(false, null); if (e?.pointerType !== "mouse" && hand.current) hand.current.style.opacity = "0"; flush(); };
  return <><canvas ref={canvas} className="pet-canvas" aria-label={`${config.nickname}，按住并滑动来抚摸，或按空格键轻抚`} tabIndex={0}
    onPointerDown={e => { if (pointer.current.id !== null) return; e.preventDefault(); pointer.current.id = e.pointerId; pointer.current.x = (e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.clientWidth; pointer.current.y = (e.clientY - e.currentTarget.getBoundingClientRect().top) / e.currentTarget.clientHeight; pointer.current.time = performance.now(); pointer.current.lastStroke = performance.now(); e.currentTarget.setPointerCapture(e.pointerId); void unlock(); move(e, true); }}
    onPointerMove={e => { if (pointer.current.id !== null && pointer.current.id !== e.pointerId) return; move(e, pointer.current.id === e.pointerId); }}
    onPointerUp={end} onPointerCancel={end} onLostPointerCapture={() => { if (pointer.current.id !== null) end(); }} onPointerLeave={() => { if (pointer.current.id === null && hand.current) hand.current.style.opacity = "0"; }}
    onKeyDown={e => { if (e.code === "Space" && !e.repeat) { e.preventDefault(); void unlock(); renderer.current?.pointer({ x: .5, y: .5 }, true); const region = config.view === "belly" ? "belly" : "spine"; stroke(region, .04, .4); onActivity(true, region); audio.current?.update(true, .3, region, config.species); if (keyboardTimer.current) clearTimeout(keyboardTimer.current); keyboardTimer.current = setTimeout(() => end(), 500); } }} />
    <Hand ref={hand} />
  </>;
}
