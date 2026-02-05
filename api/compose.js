import { createClient } from "@supabase/supabase-js";

/* -------------------------------------------------- */
/* SUPABASE (SERVICE ROLE)                            */
/* -------------------------------------------------- */

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* -------------------------------------------------- */
/* HELPERS                                            */
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
    /* 1. CALCUL DU CLIMAT DOMINANT                        */
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

    const climateEntry = Object.entries(climateScores)
      .sort((a, b) => b[1] - a[1])[0];

    if (!climateEntry) {
      return res
        .status(400)
        .json({ error: "Unable to resolve climate" });
    }

    const climate = climateEntry[0];

    /* -------------------------------------------------- */
    /* 2. CHARGEMENT DES MÉDIAS DU CLIMAT                  */
    /* -------------------------------------------------- */

    const { data: assets, error: assetErr } =
      await supabase
        .from("media_assets")
        .select("*")
        .eq("enabled", true)
        .eq("climate", climate);

    if (assetErr || !assets || assets.length === 0) {
      return res
        .status(400)
        .json({ error: "No media for climate" });
    }

    const byCat = (cat: string) =>
      shuffle(assets.filter(a => a.category === cat));

    const music = byCat("music")[0] || null;
    const videos = byCat("video").slice(0, 3);
    const shader = byCat("shader")[0] || null;
    const voices = byCat("voice").slice(0, 3);
    const texts = byCat("text").slice(0, 3);

    /* -------------------------------------------------- */
    /* 3. COMPOSITION DE LA TRAVERSÉE                      */
    /* -------------------------------------------------- */

    const duration =
      typeof music?.duration === "number"
        ? music.duration
        : 180; // fallback 3 min

    const scene = {
      climate,
      duration,

      music: music && {
        asset: music,
        start: 0,
        end: duration
      },

      visuals: {
        shader,
        videos: videos.map((v, i) => ({
          asset: v,
          start: (i / videos.length) * duration,
          end: ((i + 1) / videos.length) * duration,
          loop: true
        }))
      },

      voices: voices.map(v => ({
        asset: v,
        at: Math.random() * duration
      })),

      texts: texts.map(t => ({
        asset: t,
        at: Math.random() * duration
      }))
    };

    /* -------------------------------------------------- */
    /* RESPONSE                                           */
    /* -------------------------------------------------- */

    res.status(200).json({
      emojis,
      climate,
      scene
    });

  } catch (err) {
    console.error("[compose error]", err);
    res.status(500).json({ error: "compose failed" });
  }
}
