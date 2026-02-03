import { createClient } from "@supabase/supabase-js";

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
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return res.status(500).json({
        ok: false,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
      });
    }

    const supabase = createClient(url, key);

    const media = {};

    for (const [category, folder] of Object.entries(FOLDERS)) {
      const { data, error } = await supabase
        .storage
        .from(BUCKET)
        .list(folder, { limit: 1000 });

      if (error) {
        media[category] = [];
      } else {
        media[category] = (data ?? []).map(f => f.name);
      }
    }

    res.status(200).json({
      ok: true,
      bucket: BUCKET,
      media
    });

  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
      stack: err.stack
    });
  }
}
