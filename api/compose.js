import { createClient } from "@supabase/supabase-js";

/* -------------------------------------------------- */
/* SUPABASE (SERVICE ROLE)                            */
/* -------------------------------------------------- */

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* -------------------------------------------------- */
/* UTILS                                              */
/* -------------------------------------------------- */

const shuffle = <T>(arr: T[]) =>
  [...arr].sort(() => 0.5 - Math.random());

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
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const { emojis } = body;

    if (!Array.isArray(emojis) || emojis.length !== 3) {
      return res
        .status(400)
        .json({ error: "Exactly 3 emojis required" });
    }

    /* -------------------------------------------------- */
    /* 1. CLIMAT DOMINANT (via emoji_climate_weights)     */
    /* -------------------------------------------------- */

    const { data: climates, error: climateErr } =
      await supabase
        .from("emoji_climate_weights")
        .select("climate, weight")
        .in("emoji", emojis);

    if (climateErr || !climates || climates.length === 0) {
      return res
        .status(400)
        .json({ error: "No climate data for emojis" });
    }

    const climateScores: Record<string, number> = {};

    for (const { climate, weight } of climates) {
      climateScores[climate] =
        (climateScores[climate] || 0) + Number(weight);
    }

    const [climate] = Object.entries(climateScores)
      .sort((a, b) => b[1] - a[1])[0];

    if (!climate) {
      return res
        .status(400)
        .json({ error: "Unable to resolve climate" });
    }

    /* -------------------------------------------------- */
    /* 2. MÉDIAS DU CLIMAT                                */
    /* -------------------------------------------------- */

    const { data: assets, error: assetErr } =
      await supabase
        .from("media_assets")
        .select("path, category")
        .eq("enabled", true)
        .eq("climate", climate);

    if (assetErr || !assets || assets.length === 0) {
      return res
        .status(400)
        .json({ error: "No media for climate" });
    }

    const pick = (cat: string, n = 1) =>
      shuffle(assets.filter(a => a.category === cat))
        .slice(0, n)
        .map(a => a.path);

    /* -------------------------------------------------- */
    /* 3. FORMAT FRONT-COMPATIBLE                         */
    /* -------------------------------------------------- */

    const media = {
      music: pick("music", 1)[0] ?? null,
      video: pick("video", 1)[0] ?? null,
      shader: pick("shader", 1)[0] ?? null,
      text: pick("text", 1)[0] ?? null,
      voices: pick("voice", 3)
    };

    /* -------------------------------------------------- */
    /* RESPONSE                                           */
    /* -------------------------------------------------- */

    return res.status(200).json({
      emojis,
      climate,
      media
    });

  } catch (err) {
    console.error("[compose error]", err);
    return res.status(500).json({ error: "compose failed" });
  }
}
