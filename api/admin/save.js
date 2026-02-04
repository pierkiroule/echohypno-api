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
      const { error, count } = await supabase
        .from("emoji_media")
        .update({
          intensity: r.intensity,
          enabled: r.enabled,
        })
        .eq("id", r.id);

      if (error) {
        console.error("[save error]", error);
        throw error;
      }

      updated++;
    }

    return res.status(200).json({ ok: true, updated });

  } catch (e) {
    console.error("[admin save failed]", e);
    return res.status(500).json({ error: "save failed" });
  }
};
