import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = "scenes-media";

const FOLDERS = {
  text: "text",
  music: "music",
  voice: "voice",
  video: "video",
  shader: "shaders"
};

export default async function handler(req, res) {
  try {
    const result = {};

    for (const [category, folder] of Object.entries(FOLDERS)) {
      const { data, error } = await supabase
        .storage
        .from(BUCKET)
        .list(folder, { limit: 1000 });

      if (error) {
        console.error("[catalog]", category, error.message);
        result[category] = [];
        continue;
      }

      result[category] = (data ?? [])
        .filter(f => f.name)
        .map(f => f.name);
    }

    res.status(200).json({
      bucket: BUCKET,
      counts: Object.fromEntries(
        Object.entries(result).map(([k, v]) => [k, v.length])
      ),
      media: result
    });

  } catch (err) {
    console.error("CATALOG_ERROR", err);
    res.status(500).json({ error: "catalog_failed" });
  }
}
