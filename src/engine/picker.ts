import { clamp } from "../utils/clamp";

export function weightedPickIndex(weights: number[], rng: () => number): number {
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return Math.floor(rng() * weights.length);
  }
  const target = rng() * total;
  let cumulative = 0;
  for (let i = 0; i < weights.length; i += 1) {
    cumulative += weights[i];
    if (target <= cumulative) {
      return i;
    }
  }
  return weights.length - 1;
}

export function weightedPickWithoutReplacement<T>(
  items: T[],
  weights: number[],
  count: number,
  rng: () => number
): T[] {
  const remainingItems = [...items];
  const remainingWeights = [...weights];
  const selections: T[] = [];
  const pickCount = clamp(count, 0, items.length);

  for (let i = 0; i < pickCount; i += 1) {
    const index = weightedPickIndex(remainingWeights, rng);
    selections.push(remainingItems[index]);
    remainingItems.splice(index, 1);
    remainingWeights.splice(index, 1);
  }

  return selections;
}
