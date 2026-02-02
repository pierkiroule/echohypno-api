import { MediaCategory, MediaRole } from "../types/media";

export interface GrammarSlot {
  category: MediaCategory;
  role: MediaRole;
  count: number;
}

export const baseGrammar: GrammarSlot[] = [
  { category: "music", role: "background", count: 1 },
  { category: "video", role: "background", count: 1 },
  { category: "shader", role: "overlay", count: 1 },
  { category: "text", role: "accent", count: 1 },
];
