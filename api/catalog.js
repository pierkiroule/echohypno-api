import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase env vars");
}

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
        result[category] = [];
        continue;
      }

      result[category] = (data ?? []).map(f => f.name);
    }

    res.status(200).json({
      ok: true,
      bucket: BUCKET,
      media: result
    });

  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
}
