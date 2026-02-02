import { supabaseAdmin } from "../config/supabase";
import { loadCatalog, getCacheStatus } from "./loadCatalog";
import { MediaCategory } from "../types/media";

export interface DiagnosticsReport {
  supabaseConnected: boolean;
  bucketAccessible: boolean;
  mediaCounts: Record<MediaCategory, number>;
  cacheActive: boolean;
}

export async function buildDiagnostics(): Promise<DiagnosticsReport> {
  let supabaseConnected = true;
  let bucketAccessible = true;
  const mediaCounts: Record<MediaCategory, number> = {
    text: 0,
    music: 0,
    voice: 0,
    video: 0,
    shader: 0,
  };

  try {
    const { entries } = await loadCatalog();
    for (const entry of entries) {
      mediaCounts[entry.category] += 1;
    }
  } catch (error) {
    supabaseConnected = false;
  }

  try {
    const { data, error } = await supabaseAdmin.storage
      .from("scenes-media")
      .list("", { limit: 1 });
    if (error) {
      bucketAccessible = false;
    }
    if (!data) {
      bucketAccessible = false;
    }
  } catch (error) {
    bucketAccessible = false;
  }

  const { cacheActive } = getCacheStatus();

  return {
    supabaseConnected,
    bucketAccessible,
    mediaCounts,
    cacheActive,
  };
}
