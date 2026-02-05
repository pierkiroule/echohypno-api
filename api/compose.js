import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { emojis } = req.body;
  if (!Array.isArray(emojis) || emojis.length !== 3) {
    return res.status(400).json({ error: "3 emojis required" });
  }

  /* 1. CLIMAT DOMINANT */
  const { data: climates } = await supabase
    .from("emoji_climate_weights")
    .select("climate, weight")
    .in("emoji", emojis);

  const climateScores = {};
  climates.forEach(({ climate, weight }) => {
    climateScores[climate] =
      (climateScores[climate] || 0) + weight;
  });

  const climate = Object.entries(climateScores)
    .sort((a, b) => b[1] - a[1])[0][0];

  /* 2. MÉDIAS */
  const { data: assets } = await supabase
    .from("media_assets")
    .select("*")
    .eq("climate", climate)
    .eq("enabled", true);

  const pick = (cat, n = 1) =>
    assets.filter(a => a.category === cat)
      .sort(() => 0.5 - Math.random())
      .slice(0, n);

  const music = pick("music", 1)[0] || null;

  const scene = {
    climate,
    music,
    videos: pick("video", 2),
    shader: pick("shader", 1)[0] || null,
    voices: pick("voice", 3),
    texts: pick("text", 3)
  };

  res.json({
    emojis,
    climate,
    scene
  });
}
