import { supabaseAdmin } from "../config/supabase";
import { CatalogEntry, EmojiMedia, MediaSemantic } from "../types/media";

interface CatalogResult {
  entries: CatalogEntry[];
  loadedAt: number;
  cacheHit: boolean;
}

const cacheState: { data: CatalogEntry[] | null; loadedAt: number } = {
  data: null,
  loadedAt: 0,
};

const cacheTtlMs = Number(process.env.CACHE_TTL_MS ?? 60000);

function mergeEmojiWeights(
  semantic: MediaSemantic,
  emojiMedia: EmojiMedia[]
): Record<string, number> {
  const merged: Record<string, number> = { ...semantic.emoji_weights };
  for (const entry of emojiMedia) {
    if (entry.media_path !== semantic.path) {
      continue;
    }
    merged[entry.emoji] = (merged[entry.emoji] ?? 0) + entry.intensity;
  }
  return merged;
}

export async function loadCatalog(): Promise<CatalogResult> {
  const now = Date.now();
  if (cacheState.data && now - cacheState.loadedAt < cacheTtlMs) {
    return {
      entries: cacheState.data,
      loadedAt: cacheState.loadedAt,
      cacheHit: true,
    };
  }

  const [{ data: semantics, error: semanticsError }, { data: emojiMedia, error: emojiError }] =
    await Promise.all([
      supabaseAdmin
        .from("media_semantics")
        .select("path, category, role, climate, energy, enabled, emoji_weights")
        .eq("enabled", true),
      supabaseAdmin
        .from("emoji_media")
        .select("emoji, media_path, intensity, enabled")
        .eq("enabled", true),
    ]);

  if (semanticsError) {
    throw semanticsError;
  }

  if (emojiError) {
    throw emojiError;
  }

  const emojiMediaList = (emojiMedia ?? []) as EmojiMedia[];
  const semanticList = (semantics ?? []) as MediaSemantic[];

  const entries = semanticList.map((semantic) => ({
    path: semantic.path,
    category: semantic.category,
    role: semantic.role,
    climate: semantic.climate,
    energy: semantic.energy ?? 0,
    emojiWeights: mergeEmojiWeights(semantic, emojiMediaList),
  }));

  cacheState.data = entries;
  cacheState.loadedAt = now;

  return {
    entries,
    loadedAt: cacheState.loadedAt,
    cacheHit: false,
  };
}

export function clearCatalogCache(): void {
  cacheState.data = null;
  cacheState.loadedAt = 0;
}

export function getCacheStatus(): { cacheActive: boolean; loadedAt: number } {
  const now = Date.now();
  return {
    cacheActive: Boolean(cacheState.data && now - cacheState.loadedAt < cacheTtlMs),
    loadedAt: cacheState.loadedAt,
  };
}
