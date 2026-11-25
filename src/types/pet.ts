import type { AudioPackConfig, AssetUrl, ViewAssetSet } from "./assets";

export const SPECIES = ["cat", "dog"] as const;
export const PET_VIEWS = ["back", "belly"] as const;
export const LIGHTING_MODES = ["day", "night"] as const;

export type Species = (typeof SPECIES)[number];
export type PetView = (typeof PET_VIEWS)[number];
export type LightingMode = (typeof LIGHTING_MODES)[number];
export type CatBreedSlug = "domestic-shorthair" | "british-shorthair" | "ragdoll" | "maine-coon";
export type DogBreedSlug = "shiba-inu" | "corgi" | "golden-retriever" | "samoyed";
export type BreedSlug = CatBreedSlug | DogBreedSlug;
export type ISODateString = string;
/** BigInt counters are serialized as base-10 strings, never as JS numbers. */
export type DecimalString = string;
export type HexColor = `#${string}`;

/** Pet-local coordinates: origin at top left, x/y in [0, 1], before deformation. */
export interface Vec2 { x: number; y: number }
export interface Dimensions { width: number; height: number }

export type PetRegion =
  | "head" | "chin" | "neck" | "spine" | "rump"
  | "chest" | "belly" | "front-paw" | "hind-paw" | "tail";

export type HitShape =
  | { kind: "ellipse"; center: Vec2; radius: Vec2; rotation: number }
  | { kind: "polygon"; points: readonly Vec2[] };

export interface HitZone {
  id: string;
  region: PetRegion;
  shape: HitShape;
  /** Highest priority wins when shapes overlap; only the pet mask is interactive. */
  priority: number;
  softness: number;
  affectionMultiplier: number;
}

export type AnchorName =
  | "head" | "neck" | "chest" | "waist" | "hips"
  | "left-ear" | "right-ear" | "tail-base" | "tail-tip"
  | "front-left-paw" | "front-right-paw" | "hind-left-paw" | "hind-right-paw";

export interface RigAnchor {
  position: Vec2;
  parent: AnchorName | null;
  influenceRadius: Vec2;
}

export interface PetViewRig {
  referenceSize: Dimensions;
  anchors: Record<AnchorName, RigAnchor>;
  hitZones: readonly HitZone[];
  mesh: { columns: number; rows: number };
  /** Body-only weight mask. The head/ears/paws must keep their own proportions. */
  waistMask: {
    center: Vec2;
    radius: Vec2;
    excludedRegions: readonly PetRegion[];
  };
}

export interface SkeletonParams {
  schemaVersion: 1;
  views: Record<PetView, PetViewRig>;
  proportions: {
    headRadius: Vec2;
    torsoRadius: Vec2;
    legLength: number;
    earLength: number;
    tailLength: number;
    tailThickness: number;
  };
  earShape: "pointed" | "rounded" | "floppy" | "lynx";
  tailShape: "curved" | "thick" | "plume" | "curled" | "short";
}

export interface RegionDeformation {
  indentation: number;
  influenceRadius: number;
  springStiffness: number;
  damping: number;
  furRippleStrength: number;
  tailResponse: number;
}

export interface DeformationConfig {
  schemaVersion: 1;
  views: Record<PetView, {
    defaults: RegionDeformation;
    regions: Partial<Record<PetRegion, RegionDeformation>>;
  }>;
  breathing: { cyclesPerMinute: number; amplitude: number };
  tail: { restFrequencyHz: number; happyFrequencyHz: number; amplitude: number };
  earTwitch: { minIntervalSeconds: number; maxIntervalSeconds: number; amplitude: number };
  chubbiness: { maxWaistExpansion: number; maskFalloff: number };
  flipDurationMs: number;
}

export interface ProceduralAppearance {
  schemaVersion: 1;
  seed: number;
  furLength: number;
  furDensity: number;
  furRoughness: number;
  earInnerColor: HexColor;
  noseColor: HexColor;
  pawPadColor: HexColor;
  eyeColor: HexColor;
}

export interface ProceduralCoatPattern {
  schemaVersion: 1;
  kind: "solid" | "tabby" | "calico" | "tuxedo" | "tortoiseshell" | "colorpoint" | "sable";
  colors: readonly [HexColor, ...HexColor[]];
  seed: number;
  patternScale: number;
  stripeStrength: number;
  bellyLightness: number;
}

interface BreedBase {
  id: string;
  name: string;
  description: string | null;
  skeletonParams: SkeletonParams;
  deformationWeights: DeformationConfig;
  proceduralAppearance: ProceduralAppearance;
  backAssetUrl: AssetUrl | null;
  bellyAssetUrl: AssetUrl | null;
  displacementMapUrl: AssetUrl | null;
  audioPack: AudioPackConfig;
  coatPatterns: readonly CoatPattern[];
  sortOrder: number;
}

/** Discriminated union prevents assigning dog breed slugs to a cat at compile time. */
export type BreedIdentity =
  | { species: "cat"; slug: CatBreedSlug }
  | { species: "dog"; slug: DogBreedSlug };

export type SpeciesAndBreed = BreedBase & BreedIdentity;

export interface CoatPattern {
  id: string;
  breedId: string;
  slug: string;
  name: string;
  thumbnailUrl: AssetUrl | null;
  backTextureUrl: AssetUrl | null;
  bellyTextureUrl: AssetUrl | null;
  baseTone: HexColor;
  proceduralPattern: ProceduralCoatPattern;
  viewAssets: Record<PetView, ViewAssetSet>;
  sortOrder: number;
}

export interface SceneLighting {
  schemaVersion: 1;
  ambientColor: HexColor;
  ambientIntensity: number;
  keyLightColor: HexColor;
  keyLightIntensity: number;
  keyLightDirection: Vec2;
  shadowColor: HexColor;
  shadowOpacity: number;
  exposure: number;
  windowLight: { enabled: boolean; angle: number; softness: number; opacity: number };
}

export interface ProceduralMaterial {
  schemaVersion: 1;
  kind: "linen" | "wood" | "shag-rug" | "grass" | "cushion";
  colors: readonly [HexColor, ...HexColor[]];
  seed: number;
  textureScale: number;
  roughness: number;
}

export interface BackgroundScene {
  id: string;
  slug: string;
  name: string;
  dayAssetUrl: AssetUrl | null;
  nightAssetUrl: AssetUrl | null;
  dayLightingParams: SceneLighting;
  nightLightingParams: SceneLighting;
  ambientAudioUrl: AssetUrl | null;
  proceduralMaterial: ProceduralMaterial;
  sortOrder: number;
}

/** Only these fields are client-editable; stats and ownership are server-owned. */
export interface PetConfiguration {
  nickname: string;
  species: Species;
  breedId: string;
  coatPatternId: string;
  backgroundSceneId: string | null;
  /** Uniform pet scale, default 1; allowed [0.65, 1.35]. */
  size: number;
  /** Body-only expansion weight in [0, 1], default 0.5. */
  chubbiness: number;
  view: PetView;
  lighting: LightingMode;
}

export interface UnlockState {
  belly: boolean;
  bellyPromptSeen?: boolean;
  achievements?: readonly string[];
}

/** JSON-safe public/owner response DTO. Never include ownerId or auth secrets. */
export interface UserPetProfile extends PetConfiguration {
  id: string;
  shareCode: string;
  isPublic: boolean;
  totalPettingCount: DecimalString;
  totalPettingDurationMs: DecimalString;
  affectionPoints: number;
  intimacyLevel: number;
  unlockState: UnlockState;
  version: number;
  lastPettedAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface PetCatalog {
  schemaVersion: 1;
  revision: string;
  breeds: readonly SpeciesAndBreed[];
  backgrounds: readonly BackgroundScene[];
  defaultSelection: PetConfiguration;
}

export interface AudioPreferences { muted: boolean; volume: number }
export interface AccessibilityPreferences { reducedMotion: boolean; showHand: boolean }
