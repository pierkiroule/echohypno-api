const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const { rows } = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    if (!Array.isArray(rows)) {
      return res.status(400).json({ error: "rows array required" });
    }

    const updates = rows.map(r => ({
      emoji: r.emoji,
      media_path: r.media_path,
      role: r.role,
      intensity: r.intensity,
      enabled: r.enabled
    }));

    const { error } = await supabase
      .from("emoji_media")
      .upsert(updates, {
        onConflict: "emoji,media_path,role"
      });

    if (error) throw error;

    res.json({ ok: true, count: updates.length });

  } catch (e) {
    console.error("[admin save error]", e);
    res.status(500).json({ error: "save failed" });
  }
};
