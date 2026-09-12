import { FEATURE_UNLOCK_LEVEL, type FeatureId } from '@content/balance/unlocks';

export function unlockLevel(feature: FeatureId): number {
  return FEATURE_UNLOCK_LEVEL[feature];
}

export function isFeatureUnlocked(feature: FeatureId, playerLevel: number): boolean {
  return playerLevel >= FEATURE_UNLOCK_LEVEL[feature];
}

/** Features that become available exactly when reaching `level` (for level-up celebrations). */
export function featuresUnlockedAt(level: number): FeatureId[] {
  return (Object.keys(FEATURE_UNLOCK_LEVEL) as FeatureId[]).filter((id) => FEATURE_UNLOCK_LEVEL[id] === level);
}
