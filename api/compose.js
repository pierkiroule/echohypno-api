import { createClient } from "@supabase/supabase-js";

export const config = {
  runtime: "nodejs",
};

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// shuffle SAFE (sans générique TS)
function shuffle(arr: any[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "POST only" });

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const emojis = body?.emojis;

    if (!Array.isArray(emojis) || emojis.length !== 3) {
      return res.status(400).json({ error: "Exactly 3 emojis required" });
    }

    /* 1. CLIMATE */
    const { data: climates, error: climateErr } = await supabase
      .from("emoji_climate_weights")
      .select("climate, weight")
      .in("emoji", emojis);

    if (climateErr || !climates || climates.length === 0) {
      return res.status(400).json({ error: "No climate data" });
    }

    const scores: Record<string, number> = {};
    for (const row of climates) {
      scores[row.climate] =
        (scores[row.climate] || 0) + Number(row.weight);
    }

    const climate = Object.entries(scores).sort(
      (a, b) => b[1] - a[1]
    )[0][0];

    /* 2. MEDIA */
    const { data: assets, error: assetErr } = await supabase
      .from("media_assets")
      .select("path, category")
      .eq("enabled", true)
      .eq("climate", climate);

    if (assetErr || !assets || assets.length === 0) {
      return res.status(400).json({ error: "No media for climate" });
    }

    const byCat = (cat: string) =>
      shuffle(assets.filter((a) => a.category === cat));

    /* 3. RESPONSE */
    return res.status(200).json({
      emojis,
      climate,
      media: {
        music: byCat("music")[0]?.path ?? null,
        video: byCat("video")[0]?.path ?? null,
        shader: byCat("shader")[0]?.path ?? null,
        text: byCat("text")[0]?.path ?? null,
        voices: byCat("voice").slice(0, 3).map((v) => v.path),
      },
    });
  } catch (err) {
    console.error("[compose crash]", err);
    return res.status(500).json({ error: "compose failed" });
  }
}
