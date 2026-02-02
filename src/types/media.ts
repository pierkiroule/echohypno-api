export type MediaCategory = "text" | "music" | "voice" | "video" | "shader";
export type MediaRole = "background" | "accent" | "punctuation" | "overlay";

export interface MediaSemantic {
  path: string;
  category: MediaCategory;
  role: MediaRole;
  climate: string | null;
  energy: number | null;
  enabled: boolean;
  emoji_weights: Record<string, number> | null;
}

export interface EmojiMedia {
  emoji: string;
  media_path: string;
  intensity: number;
  enabled: boolean;
}

export interface CatalogEntry {
  path: string;
  category: MediaCategory;
  role: MediaRole;
  climate: string | null;
  energy: number;
  emojiWeights: Record<string, number>;
}

export interface SelectedMedia {
  path: string | null;
  category: MediaCategory;
  role: MediaRole;
  climate: string | null;
  energy: number | null;
  score: number;
  fallback: boolean;
}
