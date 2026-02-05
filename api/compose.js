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
/* UTILS                                              */
/* -------------------------------------------------- */

const shuffle = <T>(arr: T[]) => [...arr].sort(() => 0.5 - Math.random());

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
    /* -------------------------------------------------- */
    /* BODY SAFE PARSE                                    */
    /* -------------------------------------------------- */

    const body =
      req.body && typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body ?? {};

    console.log("[compose] body =", body);

    const emojis = body.emojis;

    if (!Array.isArray(emojis) || emojis.length !== 3) {
      return res.status(400).json({
        error: "Exactly 3 emojis required"
      });
    }

    /* -------------------------------------------------- */
    /* 1. CLIMAT DOMINANT                                 */
    /* -------------------------------------------------- */

    const {
      data: climates,
      error: climateError
    } = await supabase
      .from("emoji_climate_weights")
      .select("climate, weight")
      .in("emoji", emojis);

    console.log("[compose] climates =", climates, climateError);

    if (climateError) throw climateError;
    if (!climates || climates.length === 0) {
      return res.status(400).json({
        error: "No climate data for emojis"
      });
    }

    const scores: Record<string, number> = {};
    for (const row of climates) {
      scores[row.climate] =
        (scores[row.climate] || 0) + Number(row.weight);
    }

    const climate = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])[0][0];

    /* -------------------------------------------------- */
    /* 2. MÉDIAS DU CLIMAT                                */
    /* -------------------------------------------------- */

    const {
      data: assets,
      error: assetError
    } = await supabase
      .from("media_assets")
      .select("path, category")
      .eq("enabled", true)
      .eq("climate", climate);

    console.log("[compose] assets =", assets, assetError);

    if (assetError) throw assetError;
    if (!assets || assets.length === 0) {
      return res.status(400).json({
        error: "No media for climate"
      });
    }

    const byCategory = (category: string) =>
      shuffle(assets.filter(a => a.category === category));

    /* -------------------------------------------------- */
    /* 3. COMPOSITION SIMPLE                              */
    /* -------------------------------------------------- */

    const response = {
      emojis,
      climate,
      media: {
        music: byCategory("music")[0]?.path ?? null,
        video: byCategory("video")[0]?.path ?? null,
        shader: byCategory("shader")[0]?.path ?? null,
        text: byCategory("text")[0]?.path ?? null,
        voices: byCategory("voice")
          .slice(0, 3)
          .map(v => v.path)
      },
      oracle: {
        text: `${emojis.join(" · ")} — Une traversée se met en mouvement.`
      }
    };

    /* -------------------------------------------------- */
    /* RESPONSE                                           */
    /* -------------------------------------------------- */

    return res.status(200).json(response);

  } catch (err) {
    console.error("[compose fatal error]", err);
    return res.status(500).json({
      error: "compose failed"
    });
  }
}
