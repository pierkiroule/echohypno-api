const { createClient } = require("@supabase/supabase-js");

/* -------------------------------------------------- */
/* SUPABASE CLIENT (SERVICE ROLE)                     */
/* -------------------------------------------------- */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false }
  }
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
/* API HANDLER                                        */
/* -------------------------------------------------- */

module.exports = async function handler(req, res) {
  setCors(res);

  /* ---------- Preflight ---------- */
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    /* ---------- Body parsing sûr ---------- */
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body ?? {};

    const { rows } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "rows array required" });
    }

    let updated = 0;

    /* ---------- Update ligne par ligne (RLS safe) ---------- */
    for (const r of rows) {
      if (
        !r ||
        typeof r.emoji !== "string" ||
        typeof r.media_path !== "string" ||
        typeof r.role !== "string"
      ) {
        continue;
      }

      const { error } = await supabase
        .from("emoji_media")
        .update({
          intensity: Number(r.intensity) || 0,
          enabled: Boolean(r.enabled)
        })
        .eq("emoji", r.emoji)
        .eq("media_path", r.media_path)
        .eq("role", r.role);

      if (error) {
        console.error("[admin save row error]", {
          row: r,
          error: error.message
        });
        throw error;
      }

      updated++;
    }

    /* ---------- OK ---------- */
    return res.status(200).json({
      ok: true,
      updated
    });

  } catch (err) {
    console.error("[admin save failed]", err);
    return res.status(500).json({
      error: "save failed",
      details: err?.message ?? null
    });
  }
};
