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

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

    const { rows } = body;

    if (!Array.isArray(rows)) {
      return res.status(400).json({ error: "rows array required" });
    }

    const debug = [];

    for (const r of rows) {
      // 1️⃣ Vérifier que la ligne existe
      const { data: existing, error: selectError } = await supabase
        .from("emoji_media")
        .select("*")
        .eq("emoji", r.emoji)
        .eq("media_path", r.media_path)
        .eq("role", r.role);

      if (selectError) {
        debug.push({ step: "select_error", row: r, error: selectError });
        continue;
      }

      if (!existing || existing.length === 0) {
        debug.push({ step: "no_match", row: r });
        continue;
      }

      // 2️⃣ Update réel
      const { data: updated, error: updateError } = await supabase
        .from("emoji_media")
        .update({
          intensity: r.intensity,
          enabled: r.enabled,
        })
        .eq("emoji", r.emoji)
        .eq("media_path", r.media_path)
        .eq("role", r.role)
        .select();

      if (updateError) {
        debug.push({ step: "update_error", row: r, error: updateError });
        continue;
      }

      debug.push({
        step: "updated",
        before: existing[0],
        after: updated?.[0],
      });
    }

    return res.status(200).json({
      ok: true,
      debug,
    });

  } catch (e) {
    console.error("[admin save failed]", e);
    res.status(500).json({ error: "save failed", details: String(e) });
  }
};
