import type { BackgroundScene, BreedIdentity, CoatPattern, DeformationConfig, HexColor, HitZone, PetCatalog, PetRegion, PetViewRig, RigAnchor, SkeletonParams, SpeciesAndBreed } from "@/types/pet";
import { BREED_DIRECTORY, EMPTY_VIEW_ASSETS } from "./pet";

const anchor = (x: number, y: number, parent: RigAnchor["parent"] = "waist"): RigAnchor => ({ position: { x, y }, parent, influenceRadius: { x: .13, y: .16 } });
function rig(belly: boolean): PetViewRig {
  const region = (name: PetRegion, x: number, y: number, rx: number, ry: number, priority = 1): HitZone => ({ id: name, region: name, shape: { kind: "ellipse", center: { x, y }, radius: { x: rx, y: ry }, rotation: 0 }, priority, softness: belly ? .9 : .65, affectionMultiplier: name === "head" ? 1.3 : 1 });
  return {
    referenceSize: { width: 1400, height: 800 }, mesh: { columns: 72, rows: 44 },
    anchors: { head: anchor(.25, .5, "neck"), neck: anchor(.35, .5), chest: anchor(.4, .5), waist: anchor(.52, .5, null), hips: anchor(.65, .5), "left-ear": anchor(.21, .32, "head"), "right-ear": anchor(.21, .68, "head"), "tail-base": anchor(.72, .5, "hips"), "tail-tip": anchor(.88, .3, "tail-base"), "front-left-paw": anchor(.36, .28, "chest"), "front-right-paw": anchor(.36, .72, "chest"), "hind-left-paw": anchor(.65, .27, "hips"), "hind-right-paw": anchor(.65, .73, "hips") },
    waistMask: { center: { x: .53, y: .5 }, radius: { x: .2, y: .24 }, excludedRegions: ["head", "front-paw", "hind-paw"] },
    hitZones: [region("head", .25, .5, .13, .15, 3), region("neck", .36, .5, .07, .12, 2), region(belly ? "belly" : "spine", .52, .5, .2, .2), region("rump", .68, .5, .07, .15, 2)],
  };
}
const deformation: DeformationConfig = {
  schemaVersion: 1,
  views: {
    back: { defaults: { indentation: .018, influenceRadius: .13, springStiffness: 120, damping: 16, furRippleStrength: .012, tailResponse: .5 }, regions: {} },
    belly: { defaults: { indentation: .032, influenceRadius: .15, springStiffness: 80, damping: 12, furRippleStrength: .01, tailResponse: .8 }, regions: {} },
  },
  breathing: { cyclesPerMinute: 19, amplitude: .006 }, tail: { restFrequencyHz: .2, happyFrequencyHz: .9, amplitude: .03 }, earTwitch: { minIntervalSeconds: 5, maxIntervalSeconds: 14, amplitude: .02 }, chubbiness: { maxWaistExpansion: .28, maskFalloff: 2 }, flipDurationMs: 650,
};

export const COATS = [
  { slug: "ginger", name: "暖橘", colors: ["#c48545", "#e9b975", "#895027"], kind: "tabby" },
  { slug: "black", name: "乌云", colors: ["#303235", "#555454", "#181b1e"], kind: "solid" },
  { slug: "calico", name: "三花", colors: ["#e7ddd0", "#b6763d", "#383b39"], kind: "calico" },
  { slug: "white", name: "初雪", colors: ["#eae7de", "#faf7ee", "#b7b4ac"], kind: "solid" },
  { slug: "tabby", name: "狸花", colors: ["#8f8978", "#bbb39a", "#49483c"], kind: "tabby" },
  { slug: "tuxedo", name: "奶牛", colors: ["#e9e4d9", "#323639", "#535654"], kind: "tuxedo" },
  { slug: "blue", name: "蓝灰", colors: ["#7e8890", "#a6b0b5", "#4c5964"], kind: "solid" },
  { slug: "tortoiseshell", name: "玳瑁", colors: ["#3c3630", "#b5814a", "#766044"], kind: "tortoiseshell" },
  { slug: "colorpoint", name: "重点色", colors: ["#d9cbb8", "#786450", "#4d443a"], kind: "colorpoint" },
  { slug: "cream", name: "奶油", colors: ["#d7bb88", "#f1e3bf", "#b59161"], kind: "sable" },
] as const;

const anatomy: Record<BreedIdentity["slug"], { ear: SkeletonParams["earShape"]; tail: SkeletonParams["tailShape"]; fur: number; head: number; body: number; leg: number }> = {
  "domestic-shorthair": { ear: "pointed", tail: "curved", fur: .35, head: .13, body: .19, leg: .1 },
  "british-shorthair": { ear: "rounded", tail: "thick", fur: .5, head: .145, body: .21, leg: .09 },
  ragdoll: { ear: "rounded", tail: "plume", fur: .85, head: .13, body: .21, leg: .11 },
  "maine-coon": { ear: "lynx", tail: "plume", fur: 1, head: .14, body: .205, leg: .13 },
  "shiba-inu": { ear: "pointed", tail: "curled", fur: .6, head: .14, body: .19, leg: .13 },
  corgi: { ear: "pointed", tail: "short", fur: .45, head: .145, body: .21, leg: .07 },
  "golden-retriever": { ear: "floppy", tail: "plume", fur: .85, head: .15, body: .2, leg: .15 },
  samoyed: { ear: "pointed", tail: "curled", fur: 1, head: .155, body: .225, leg: .14 },
};

export const BREEDS: SpeciesAndBreed[] = BREED_DIRECTORY.map((entry, i) => {
  const a = anatomy[entry.slug];
  const available = entry.species === "cat" ? COATS : COATS.filter(c => ["ginger", "black", "white", "cream", "colorpoint"].includes(c.slug));
  const coats: CoatPattern[] = available.map((c, ci) => ({ id: `${entry.slug}/${c.slug}`, breedId: entry.slug, slug: c.slug, name: c.name, thumbnailUrl: null, backTextureUrl: null, bellyTextureUrl: null, baseTone: c.colors[0], proceduralPattern: { schemaVersion: 1, kind: c.kind, colors: [...c.colors], seed: 41 + ci * 89, patternScale: 1, stripeStrength: c.kind === "tabby" ? .8 : 0, bellyLightness: .32 }, viewAssets: { back: { ...EMPTY_VIEW_ASSETS }, belly: { ...EMPTY_VIEW_ASSETS } }, sortOrder: ci }));
  return {
    ...entry, id: entry.slug, description: entry.species === "cat" ? "慢慢靠近，把这一刻交给呼噜声。" : "你的陪伴，就是它最开心的事。", sortOrder: i,
    skeletonParams: { schemaVersion: 1, views: { back: rig(false), belly: rig(true) }, proportions: { headRadius: { x: a.head, y: a.head * 1.2 }, torsoRadius: { x: .25, y: a.body }, legLength: a.leg, earLength: a.ear === "lynx" ? .12 : .09, tailLength: a.tail === "short" ? .1 : .26, tailThickness: a.fur * .05 + .025 }, earShape: a.ear, tailShape: a.tail },
    deformationWeights: deformation,
    proceduralAppearance: { schemaVersion: 1, seed: 2026 + i, furLength: a.fur, furDensity: .8, furRoughness: .6, earInnerColor: "#bd8c80", noseColor: "#a16a60", pawPadColor: "#d4a0a0", eyeColor: "#8c9b6b" },
    backAssetUrl: null, bellyAssetUrl: null, displacementMapUrl: null,
    audioPack: { schemaVersion: 1, species: entry.species, clips: {}, synth: { enabled: true, purrBaseHz: 53, purrPulseHz: 25, noiseLowpassHz: 400, attackSeconds: .25, releaseSeconds: 1.2 } }, coatPatterns: coats,
  } as SpeciesAndBreed;
});

const sceneDefinitions = [
  { slug: "linen", name: "阳光亚麻", kind: "linen", color: "#d9cbb3" },
  { slug: "wood", name: "温暖木地板", kind: "wood", color: "#bd9773" },
  { slug: "shag-rug", name: "柔软绒毯", kind: "shag-rug", color: "#cec3b5" },
  { slug: "grass", name: "午后草坪", kind: "grass", color: "#8b9b72" },
  { slug: "cushion", name: "沙发一角", kind: "cushion", color: "#c1b8a5" },
] as const;
export const BACKGROUNDS: BackgroundScene[] = sceneDefinitions.map((s, i) => ({
  id: s.slug, slug: s.slug, name: s.name, dayAssetUrl: null, nightAssetUrl: null, ambientAudioUrl: null, sortOrder: i,
  proceduralMaterial: { schemaVersion: 1, kind: s.kind, colors: [s.color, "#ece3d4"], seed: 50 + i, textureScale: 1, roughness: .8 },
  dayLightingParams: { schemaVersion: 1, ambientColor: "#f1e8d8", ambientIntensity: .8, keyLightColor: "#fff1ce", keyLightIntensity: 1, keyLightDirection: { x: -.5, y: -.8 }, shadowColor: "#514232", shadowOpacity: .24, exposure: 1, windowLight: { enabled: true, angle: -.5, softness: .5, opacity: .2 } },
  nightLightingParams: { schemaVersion: 1, ambientColor: "#687f9b", ambientIntensity: .4, keyLightColor: "#b0c9de", keyLightIntensity: .4, keyLightDirection: { x: -.5, y: -.8 }, shadowColor: "#101a29", shadowOpacity: .45, exposure: .65, windowLight: { enabled: true, angle: -.5, softness: .7, opacity: .1 } },
}));

export const DEFAULT_CONFIGURATION: PetCatalog["defaultSelection"] = { nickname: "团子", species: "cat", breedId: "domestic-shorthair", coatPatternId: "domestic-shorthair/ginger", backgroundSceneId: "linen", size: 1, chubbiness: .5, view: "back", lighting: "day" };
export const CATALOG: PetCatalog = { schemaVersion: 1, revision: "2026-11-25-v2", breeds: BREEDS, backgrounds: BACKGROUNDS, defaultSelection: DEFAULT_CONFIGURATION };
export function findBreed(id: string) { return BREEDS.find(b => b.id === id) ?? BREEDS[0]!; }
export function findCoat(breedId: string, coatId: string) { const b = findBreed(breedId); return b.coatPatterns.find(c => c.id === coatId) ?? b.coatPatterns[0]!; }
export function colorTuple(color: HexColor): [number, number, number] { return [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)]; }
