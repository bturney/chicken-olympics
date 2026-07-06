export interface ArenaOptions {
  spotCount: number;
  spotPositions?: readonly { x: number; y: number }[];
  occupiedSpotIndices?: readonly number[];
  reservedSpotIndices?: readonly number[];
  recentSpotIndices?: readonly number[];
}

export interface Arena {
  allocateSpot(randomValue: number): number | null;
  releaseSpot(spotIndex: number): void;
  reserveSpot(spotIndex: number): void;
}

const RECENT_SPOT_MEMORY = 2;

export function createArena(options: ArenaOptions): Arena {
  const occupied = new Set(options.occupiedSpotIndices ?? []);
  const reserved = new Set(options.reservedSpotIndices ?? []);
  let recentSpotIndices: number[] = [...(options.recentSpotIndices ?? [])];

  const rememberSpot = (spotIndex: number): void => {
    recentSpotIndices = [
      spotIndex,
      ...recentSpotIndices.filter((recent) => recent !== spotIndex),
    ].slice(0, RECENT_SPOT_MEMORY);
  };

  return {
    allocateSpot(randomValue: number): number | null {
      const free: number[] = [];
      for (let i = 0; i < options.spotCount; i++) {
        if (!occupied.has(i) && !reserved.has(i)) free.push(i);
      }
      if (free.length === 0) return null;

      const pool = chooseAllocationPool(
        free,
        recentSpotIndices,
        options.spotPositions,
      );
      const index = Math.floor(
        Math.max(0, Math.min(1, randomValue)) * pool.length,
      );
      const spot = pool[Math.min(index, pool.length - 1)] ?? null;
      if (spot !== null) occupied.add(spot);
      return spot;
    },
    releaseSpot(spotIndex: number): void {
      occupied.delete(spotIndex);
      reserved.delete(spotIndex);
      rememberSpot(spotIndex);
    },
    reserveSpot(spotIndex: number): void {
      reserved.add(spotIndex);
    },
  };
}

function chooseAllocationPool(
  free: readonly number[],
  recentSpotIndices: readonly number[],
  spotPositions: readonly { x: number; y: number }[] | undefined,
): readonly number[] {
  const recent = recentSpotIndices;
  const recentSet = new Set(recentSpotIndices);
  const candidates =
    recentSpotIndices.length > 0
      ? free.filter((spot) => !recentSet.has(spot))
      : free;
  const pool = candidates.length > 0 ? candidates : free;
  if (!spotPositions || recent.length === 0) return pool;

  let bestDistance = -1;
  const scored = pool.map((spot) => {
    const spotPosition = spotPositions[spot];
    let distance = 0;
    if (spotPosition !== undefined) {
      let shortest = Number.POSITIVE_INFINITY;
      for (const recentSpot of recent) {
        const recentPosition = spotPositions[recentSpot];
        if (recentPosition === undefined) continue;
        const dx = spotPosition.x - recentPosition.x;
        const dy = spotPosition.y - recentPosition.y;
        const d = Math.hypot(dx, dy);
        if (d < shortest) shortest = d;
      }
      if (shortest !== Number.POSITIVE_INFINITY) distance = shortest;
    }
    if (distance > bestDistance) bestDistance = distance;
    return { spot, distance };
  });

  return scored
    .filter((candidate) => candidate.distance === bestDistance)
    .map((candidate) => candidate.spot);
}
