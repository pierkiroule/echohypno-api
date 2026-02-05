import { createClient } from "@supabase/supabase-js";

export const config = {
  runtime: "nodejs"
};

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const shuffle = <T>(arr: T[]) => [...arr].sort(() => 0.5 - Math.random());

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { emojis } = body;

    if (!Array.isArray(emojis) || emojis.length !== 3) {
      return res.status(400).json({ error: "Exactly 3 emojis required" });
    }

    /* 1. CLIMAT */
    const { data: climates, error } = await supabase
      .from("emoji_climate_weights")
      .select("climate, weight")
      .in("emoji", emojis);

    if (error || !climates?.length) {
      return res.status(400).json({ error: "No climate data" });
    }

    const scores = {};
    climates.forEach(({ climate, weight }) => {
      scores[climate] = (scores[climate] || 0) + Number(weight);
    });

    const climate = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];

    /* 2. MÉDIAS */
    const { data: assets } = await supabase
      .from("media_assets")
      .select("path, category")
      .eq("enabled", true)
      .eq("climate", climate);

    if (!assets?.length) {
      return res.status(400).json({ error: "No media for climate" });
    }

    const byCat = (c) => shuffle(assets.filter(a => a.category === c));

    res.status(200).json({
      emojis,
      climate,
      media: {
        music: byCat("music")[0]?.path ?? null,
        video: byCat("video")[0]?.path ?? null,
        shader: byCat("shader")[0]?.path ?? null,
        text: byCat("text")[0]?.path ?? null,
        voices: byCat("voice").slice(0, 3).map(v => v.path)
      }
    });

  } catch (err) {
    console.error("compose failed", err);
    res.status(500).json({ error: "compose failed" });
  }
}
