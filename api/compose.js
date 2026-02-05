import { createClient } from "@supabase/supabase-js";

export const config = {
  runtime: "nodejs"
};

/* -------------------------------------------------- */
/* SUPABASE                                           */
/* -------------------------------------------------- */

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* -------------------------------------------------- */
/* HELPERS                                            */
/* -------------------------------------------------- */

const shuffle = <T,>(arr: T[]) =>
  [...arr].sort(() => Math.random() - 0.5);

/* -------------------------------------------------- */
/* HANDLER                                            */
/* -------------------------------------------------- */

export default async function handler(req, res) {
  /* ---------- CORS ---------- */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    /* ---------- BODY ---------- */
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const { emojis } = body;

    if (!Array.isArray(emojis) || emojis.length !== 3) {
      return res.status(400).json({
        error: "Exactly 3 emojis required"
      });
    }

    /* -------------------------------------------------- */
    /* 1. CLIMAT DOMINANT                                  */
    /* -------------------------------------------------- */

    const { data: climates, error: climateErr } = await supabase
      .from("emoji_climate_weights")
      .select("climate, weight")
      .in("emoji", emojis);

    if (climateErr) {
      console.error("emoji_climate_weights error", climateErr);
      return res.status(500).json({ error: "Climate query failed" });
    }

    if (!Array.isArray(climates) || climates.length === 0) {
      return res.status(400).json({
        error: "No climate data for emojis",
        emojis
      });
    }

    const climateScores: Record<string, number> = {};

    for (const row of climates) {
      climateScores[row.climate] =
        (climateScores[row.climate] || 0) + Number(row.weight);
    }

    const climate = Object.entries(climateScores)
      .sort((a, b) => b[1] - a[1])[0][0];

    /* -------------------------------------------------- */
    /* 2. MÉDIAS                                          */
    /* -------------------------------------------------- */

    const { data: assets, error: assetErr } = await supabase
      .from("media_assets")
      .select("path, category")
      .eq("enabled", true)
      .eq("climate", climate);

    if (assetErr) {
      console.error("media_assets error", assetErr);
      return res.status(500).json({ error: "Media query failed" });
    }

    if (!Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({
        error: "No media for climate",
        climate
      });
    }

    const byCategory = (cat: string) =>
      assets.filter((a) => a.category === cat);

    const pick = (cat: string, n = 1) =>
      shuffle(byCategory(cat)).slice(0, n);

    /* -------------------------------------------------- */
    /* 3. RESPONSE                                        */
    /* -------------------------------------------------- */

    return res.status(200).json({
      emojis,
      climate,
      media: {
        music: pick("music")[0]?.path ?? null,
        video: pick("video")[0]?.path ?? null,
        shader: pick("shader")[0]?.path ?? null,
        text: pick("text")[0]?.path ?? null,
        voices: pick("voice", 3).map((v) => v.path)
      }
    });

  } catch (err) {
    console.error("[compose fatal]", err);
    return res.status(500).json({
      error: "compose failed",
      message: err instanceof Error ? err.message : String(err)
    });
  }
}
