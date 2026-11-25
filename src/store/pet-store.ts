import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_CONFIGURATION, findBreed } from "@/config/catalog";
import type { PetConfiguration, Species } from "@/types/pet";

type PetStore = {
  config: PetConfiguration; muted: boolean; volume: number;
  totalStrokes: number; totalSeconds: number; affection: number;
  profile: { id: string; version: number } | null;
  setProfile: (profile: { id: string; version: number } | null) => void;
  setConfig: (patch: Partial<PetConfiguration>) => void;
  selectSpecies: (species: Species) => void;
  selectBreed: (id: string) => void;
  setSound: (muted: boolean, volume?: number) => void;
  stroke: (seconds: number) => void;
};
export const usePetStore = create<PetStore>()(persist((set) => ({
  config: { ...DEFAULT_CONFIGURATION }, muted: false, volume: .55, totalStrokes: 0, totalSeconds: 0, affection: 0, profile: null,
  setProfile: profile => set({ profile }),
  setConfig: patch => set(s => ({ config: { ...s.config, ...patch }, profile: patch.breedId && patch.breedId !== s.config.breedId ? null : s.profile })),
  selectSpecies: species => set(s => { const id = species === "cat" ? "domestic-shorthair" : "shiba-inu"; return { profile: null, config: { ...s.config, species, breedId: id, coatPatternId: `${id}/ginger`, nickname: species === "cat" ? "团子" : "年糕", view: "back" } }; }),
  selectBreed: id => set(s => { const breed = findBreed(id), slug = s.config.coatPatternId.split("/")[1]; const preferred = id === "samoyed" ? "white" : id === "ragdoll" ? "colorpoint" : slug; return { profile: null, config: { ...s.config, species: breed.species, breedId: id, coatPatternId: breed.coatPatterns.find(c => c.slug === preferred)?.id ?? breed.coatPatterns[0]!.id } }; }),
  setSound: (muted, volume) => set(s => ({ muted, volume: volume ?? s.volume })),
  stroke: seconds => set(s => ({ totalStrokes: s.totalStrokes + 1, totalSeconds: s.totalSeconds + Math.min(2, Math.max(.1, seconds)), affection: Math.min(100, s.affection + .8) })),
}), { name: "cloud-pet-v2", skipHydration: true, partialize: s => ({ config: s.config, muted: s.muted, volume: s.volume, totalStrokes: s.totalStrokes, totalSeconds: s.totalSeconds, affection: s.affection, profile: s.profile }) }));
