import { randomUUID } from "crypto";
import { baseGrammar } from "./grammar";
import { loadCatalog } from "./loadCatalog";
import { weightedPickWithoutReplacement } from "./picker";
import { CatalogEntry, MediaCategory, MediaRole, SelectedMedia } from "../types/media";
import { SceneRequest, SceneResponse } from "../types/scene";
import { createSeededRandom } from "../utils/seed";

interface ScoredEntry {
  entry: CatalogEntry;
  score: number;
}

function scoreEntry(entry: CatalogEntry, emojis: string[], rng: () => number): number {
  const emojiScore = emojis.reduce((sum, emoji) => sum + (entry.emojiWeights[emoji] ?? 0), 0);
  const energyScore = entry.energy * 0.5;
  const noise = rng() * 0.2 - 0.1;
  return emojiScore + energyScore + noise;
}

function buildFallback(category: MediaCategory, role: MediaRole): SelectedMedia {
  return {
    path: null,
    category,
    role,
    climate: null,
    energy: null,
    score: 0,
    fallback: true,
  };
}

function pickFromCatalog(
  catalog: CatalogEntry[],
  emojis: string[],
  rng: () => number,
  category: MediaCategory,
  role: MediaRole,
  count: number,
  usedPaths: Set<string>
): SelectedMedia[] {
  const candidates = catalog.filter(
    (entry) => entry.category === category && entry.role === role && !usedPaths.has(entry.path)
  );

  const scored: ScoredEntry[] = candidates.map((entry) => ({
    entry,
    score: scoreEntry(entry, emojis, rng),
  }));

  const picks = weightedPickWithoutReplacement(
    scored,
    scored.map((item) => Math.max(item.score, 0)),
    count,
    rng
  );

  picks.forEach((item) => usedPaths.add(item.entry.path));

  if (picks.length === 0) {
    return [buildFallback(category, role)];
  }

  return picks.map((item) => ({
    path: item.entry.path,
    category: item.entry.category,
    role: item.entry.role,
    climate: item.entry.climate,
    energy: item.entry.energy,
    score: item.score,
    fallback: false,
  }));
}

function pickText(catalog: CatalogEntry[], emojis: string[], rng: () => number, usedPaths: Set<string>) {
  const strict = pickFromCatalog(catalog, emojis, rng, "text", "accent", 1, usedPaths);
  if (!strict[0].fallback) {
    return strict[0];
  }
  const anyText = catalog.filter((entry) => entry.category === "text" && !usedPaths.has(entry.path));
  if (anyText.length === 0) {
    return buildFallback("text", "accent");
  }
  const scored = anyText.map((entry) => ({
    entry,
    score: scoreEntry(entry, emojis, rng),
  }));
  const [pick] = weightedPickWithoutReplacement(
    scored,
    scored.map((item) => Math.max(item.score, 0)),
    1,
    rng
  );
  if (!pick) {
    return buildFallback("text", "accent");
  }
  usedPaths.add(pick.entry.path);
  return {
    path: pick.entry.path,
    category: pick.entry.category,
    role: pick.entry.role,
    climate: pick.entry.climate,
    energy: pick.entry.energy,
    score: pick.score,
    fallback: false,
  };
}

function inferClimate(selected: SelectedMedia[]): string | null {
  const counts = new Map<string, number>();
  for (const item of selected) {
    if (!item.climate) {
      continue;
    }
    counts.set(item.climate, (counts.get(item.climate) ?? 0) + 1);
  }
  let top: string | null = null;
  let max = 0;
  counts.forEach((count, climate) => {
    if (count > max) {
      top = climate;
      max = count;
    }
  });
  return top;
}

export async function buildScene(request: SceneRequest): Promise<SceneResponse> {
  const rngState = createSeededRandom(request.seed);
  const { entries } = await loadCatalog();
  const usedPaths = new Set<string>();

  const music = pickFromCatalog(entries, request.emojis, rngState.next, "music", "background", 1, usedPaths)[0];
  const video = pickFromCatalog(entries, request.emojis, rngState.next, "video", "background", 1, usedPaths)[0];
  const shader = pickFromCatalog(entries, request.emojis, rngState.next, "shader", "overlay", 1, usedPaths)[0];
  const text = pickText(entries, request.emojis, rngState.next, usedPaths);

  const voiceCount = Math.floor(rngState.next() * 4) + 1;
  const voices = pickFromCatalog(entries, request.emojis, rngState.next, "voice", "punctuation", voiceCount, usedPaths);

  const allSelected = [music, video, shader, text, ...voices];
  const sceneClimate = inferClimate(allSelected);

  return {
    id: randomUUID(),
    seed: rngState.seed,
    archetype: request.emojis.length ? `echo-${request.emojis.join("")}` : "echo-neutral",
    sceneClimate,
    media: {
      text,
      music,
      video,
      shader,
      voicePool: voices,
    },
  };
}

export { baseGrammar };
