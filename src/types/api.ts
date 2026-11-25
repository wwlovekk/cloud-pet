import type {
  DecimalString, ISODateString, PetCatalog, PetConfiguration,
  PetRegion, PetView, Species, UnlockState, UserPetProfile,
} from "./pet";

export type ApiErrorCode =
  | "VALIDATION_ERROR" | "NOT_FOUND" | "UNAUTHORIZED" | "FORBIDDEN"
  | "VERSION_CONFLICT" | "CATALOG_MISMATCH" | "RATE_LIMITED" | "INTERNAL_ERROR";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ApiErrorCode; message: string; fields?: Record<string, string[]> } };

export type CatalogResponse = ApiResult<PetCatalog>;

/** The server resolves ownerId from an HttpOnly signed session, never from JSON. */
export interface CreatePetRequest extends PetConfiguration {
  isPublic?: boolean;
}

export interface UpdatePetRequest extends Partial<PetConfiguration> {
  expectedVersion: number;
  isPublic?: boolean;
}

export interface PetProfileResponse {
  pet: UserPetProfile;
  canEdit: boolean;
  /** /p/<shareCode>; null until sharing is enabled. */
  shareUrl: string | null;
}

/** Batched counters, never raw movement traces. A retry must reuse the same IDs. */
export interface PettingTelemetryRequest {
  batchId: string;
  sessionId: string;
  sequence: number;
  petId?: string;
  species: Species;
  breedId: string;
  view: PetView;
  durationMs: number;
  strokeCount: number;
  distanceNormalized: number;
  averageSpeed: number;
  regionCounts: Partial<Record<PetRegion, number>>;
  clientStartedAt: ISODateString;
  clientEndedAt: ISODateString;
}

export interface PettingTelemetryResponse {
  batchId: string;
  /** False for a duplicate; no profile or global counters increment on retries. */
  accepted: boolean;
  affectionEarned: number;
  profile: null | {
    id: string;
    affectionPoints: number;
    intimacyLevel: number;
    unlockState: UnlockState;
    totalPettingCount: DecimalString;
  };
  globalPettingCount: DecimalString;
}

export interface BreedRanking {
  breedId: string;
  name: string;
  species: Species;
  totalPettingCount: DecimalString;
  totalDurationMs: DecimalString;
}

export interface GlobalStatsResponse {
  totalPettingCount: DecimalString;
  totalDurationMs: DecimalString;
  popularBreeds: readonly BreedRanking[];
  updatedAt: ISODateString;
}
