import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs" };

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { emojis } = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    if (!Array.isArray(emojis) || emojis.length !== 3) {
      return res.status(400).json({ error: "Exactly 3 emojis required" });
    }

    const { data: climates } = await supabase
      .from("emoji_climate_weights")
      .select("climate, weight")
      .in("emoji", emojis);

    if (!climates?.length) {
      return res.status(400).json({ error: "No climate data" });
    }

    const scores = {};
    climates.forEach(({ climate, weight }) => {
      scores[climate] = (scores[climate] || 0) + Number(weight);
    });

    const climate = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];

    const { data: assets } = await supabase
      .from("media_assets")
      .select("path, category")
      .eq("enabled", true)
      .eq("climate", climate);

    const byCat = (c) => shuffle(assets.filter(a => a.category === c));

    return res.status(200).json({
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

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "compose failed" });
  }
}
