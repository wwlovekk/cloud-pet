import type { BreedIdentity, PetConfiguration, UnlockState } from "@/types/pet";
import type { ViewAssetSet } from "@/types/assets";

// Schema/DTO consumers must validate these ranges at the server boundary.
export const PET_LIMITS = {
  size: { min: 0.65, max: 1.35, default: 1 },
  chubbiness: { min: 0, max: 1, default: 0.5 },
  nickname: { minLength: 1, maxLength: 24 },
  affection: { min: 0, max: 10_000, bellyPromptAt: 600 },
  telemetry: {
    flushIntervalMs: 10_000,
    maxBatchDurationMs: 15_000,
    maxStrokesPerBatch: 150,
    minStrokeDistance: 0.04,
    maxPointerSpeed: 10,
  },
  renderer: { maxPixelRatio: 2, reducedMotionPixelRatio: 1.5 },
} as const;

export const INITIAL_PET_PREFERENCES = {
  nickname: "团子",
  size: PET_LIMITS.size.default,
  chubbiness: PET_LIMITS.chubbiness.default,
  view: "back",
  lighting: "day",
} as const satisfies Pick<PetConfiguration, "nickname" | "size" | "chubbiness" | "view" | "lighting">;

export const INITIAL_UNLOCK_STATE = { belly: false } as const satisfies UnlockState;

export const BREED_DIRECTORY = [
  { species: "cat", slug: "domestic-shorthair", name: "田园短毛猫" },
  { species: "cat", slug: "british-shorthair", name: "英国短毛猫" },
  { species: "cat", slug: "ragdoll", name: "布偶猫" },
  { species: "cat", slug: "maine-coon", name: "缅因猫" },
  { species: "dog", slug: "shiba-inu", name: "柴犬" },
  { species: "dog", slug: "corgi", name: "柯基" },
  { species: "dog", slug: "golden-retriever", name: "金毛寻回犬" },
  { species: "dog", slug: "samoyed", name: "萨摩耶" },
] as const satisfies readonly (BreedIdentity & { name: string })[];

export const EMPTY_VIEW_ASSETS = {
  albedo: null,
  normal: null,
  displacement: null,
  interactionMask: null,
  roughness: null,
} as const satisfies ViewAssetSet;
