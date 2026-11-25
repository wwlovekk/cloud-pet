import type { PetConfiguration, PetRegion, PetView, Vec2 } from "./pet";

export interface PointerSample {
  pointerId: number;
  pointerType: "mouse" | "touch" | "pen";
  position: Vec2;
  previousPosition: Vec2;
  /** Pet-local reference widths per second. */
  speed: number;
  /** Synthesized when hardware pressure is unavailable. */
  pressure: number;
  isDown: boolean;
  timestampMs: number;
}

export interface ContactState {
  active: boolean;
  position: Vec2;
  region: PetRegion | null;
  pressure: number;
  speed: number;
  directionRadians: number;
}

/** Switch rig, masks and textures together at the midpoint; suspend contact meanwhile. */
export type FlipState =
  | { phase: "idle"; view: PetView }
  | { phase: "turning-out"; from: PetView; to: PetView; progress: number }
  | { phase: "turning-in"; from: PetView; to: PetView; progress: number };

export type PetReaction = "rest" | "purr" | "knead" | "paw-tuck" | "leg-kick" | "tail-wag";

export interface PettingFrame {
  elapsedSeconds: number;
  deltaSeconds: number;
  view: PetView;
  contact: ContactState;
  reaction: PetReaction;
  relaxation: number;
  /** Procedural fallback and texture renderer consume the same input. */
  configuration: PetConfiguration;
}

/** React owns controls; the renderer owns its RAF/ticker, meshes and GPU resources. */
export interface PetRenderer {
  init(canvas: HTMLCanvasElement): Promise<void>;
  resize(width: number, height: number, pixelRatio: number): void;
  updateConfiguration(configuration: PetConfiguration): void;
  setContact(contact: ContactState): void;
  flipTo(view: PetView): Promise<void>;
  /** Remove event listeners/tickers, release textures and any AudioContext references. */
  destroy(): void;
}

export interface AudioModulation {
  species: "cat" | "dog";
  contact: ContactState;
  pettingDurationSeconds: number;
  relaxation: number;
  reaction: PetReaction;
}

export interface PetAudioEngine {
  /** Call only from a user gesture to satisfy browser autoplay restrictions. */
  unlock(): Promise<void>;
  update(modulation: AudioModulation): void;
  setMuted(muted: boolean): void;
  setVolume(volume: number): void;
  suspend(): Promise<void>;
  destroy(): Promise<void>;
}
