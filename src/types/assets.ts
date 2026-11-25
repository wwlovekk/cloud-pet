import type { BreedSlug, Dimensions, PetView, Species } from "./pet";

/** Same-origin /assets/... or HTTPS CDN URL. Private credentials never enter here. */
export type AssetUrl = string;
/** Key relative to ASSET_PUBLIC_BASE_URL, identical across local, R2 and S3. */
export type AssetKey = string;
export type AssetStorageDriver = "local" | "r2" | "s3";

export interface ImageAsset {
  key: AssetKey;
  dimensions: Dimensions;
  /** All maps for one view must align in the same transparent reference frame. */
  colorSpace: "srgb" | "linear";
}

export interface ViewAssetSet {
  albedo: ImageAsset | null;
  normal: ImageAsset | null;
  displacement: ImageAsset | null;
  /** alpha = pet silhouette, red = waist weights; green/blue reserved. */
  interactionMask: ImageAsset | null;
  roughness: ImageAsset | null;
}

export type AudioCue = "purr" | "coo" | "pant" | "sigh" | "tail-tap" | "fur-rub" | "ambient";

export interface AudioClip {
  key: AssetKey;
  loop: boolean;
  gain: number;
  playbackRateRange: readonly [number, number];
}

export interface AudioPackConfig {
  schemaVersion: 1;
  species: Species;
  clips: Partial<Record<AudioCue, readonly AudioClip[]>>;
  synth: {
    enabled: boolean;
    purrBaseHz: number;
    purrPulseHz: number;
    noiseLowpassHz: number;
    attackSeconds: number;
    releaseSeconds: number;
  };
}

export interface BreedAssetOverride {
  views?: Partial<Record<PetView, Partial<ViewAssetSet>>>;
  audio?: Partial<Record<AudioCue, readonly AudioClip[]>>;
}

export interface CoatAssetOverride {
  thumbnail?: ImageAsset;
  views?: Partial<Record<PetView, Partial<ViewAssetSet>>>;
}

/** Sparse overrides; missing/null/failed assets always use the procedural fallback. */
export interface AssetManifest {
  $schema?: string;
  schemaVersion: 1;
  revision: string;
  baseUrl: AssetUrl;
  breeds: Partial<Record<BreedSlug, BreedAssetOverride>>;
  /** Keys: <breed-slug>/<coat-slug>, e.g. domestic-shorthair/black. */
  coats: Record<string, CoatAssetOverride>;
  backgrounds: Record<string, {
    day?: ImageAsset;
    night?: ImageAsset;
    ambientAudioKey?: AssetKey;
  }>;
  hand: {
    day: ImageAsset | null;
    night: ImageAsset | null;
    pivot: { x: number; y: number };
  };
}
