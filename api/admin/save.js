const { createClient } = require("@supabase/supabase-js");

/* -------------------------------------------------- */
/* SUPABASE CLIENT — SERVICE ROLE                     */
/* -------------------------------------------------- */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* -------------------------------------------------- */
/* CORS                                               */
/* -------------------------------------------------- */

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/* -------------------------------------------------- */
/* HANDLER                                            */
/* -------------------------------------------------- */

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const { rows } = body;

    if (!Array.isArray(rows)) {
      return res.status(400).json({ error: "rows array required" });
    }

    let updated = 0;

    for (const r of rows) {
      if (
        !r.emoji ||
        !r.media_path ||
        !r.role ||
        typeof r.intensity !== "number" ||
        typeof r.enabled !== "boolean"
      ) {
        console.warn("⛔ Row ignorée (incomplète)", r);
        continue;
      }

      const { error } = await supabase
        .from("emoji_media")
        .update({
          intensity: r.intensity,
          enabled: r.enabled,
        })
        .eq("emoji", r.emoji)
        .eq("media_path", r.media_path)
        .eq("role", r.role);

      if (error) {
        console.error("❌ UPDATE FAILED", error, r);
        return res.status(500).json({
          error: "update failed",
          details: error.message,
          row: r,
        });
      }

      updated++;
    }

    return res.status(200).json({
      ok: true,
      updated,
    });

  } catch (e) {
    console.error("[admin save fatal]", e);
    return res.status(500).json({ error: "save failed" });
  }
};
