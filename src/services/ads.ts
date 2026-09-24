/**
 * Future ads placement hooks — not implemented in v1.
 * Keep ads out of active turn resolution.
 */

export type AdPlacement =
  | 'home_banner'
  | 'between_rounds_interstitial'
  | 'results_rewarded';

export function canShowAd(
  placement: AdPlacement,
  isActiveTurn: boolean
): boolean {
  if (isActiveTurn) return false;
  void placement;
  return false; // ads disabled in v1
}

export async function showAd(_placement: AdPlacement): Promise<void> {
  // no-op until ad SDK is integrated
}
