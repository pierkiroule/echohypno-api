import { createClient } from "@supabase/supabase-js";

type MediaAsset = {
  path: string;
  category: string;
};

type ClimateWeight = {
  climate: string;
  weight: number | string;
};

const setCors = (res: any) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

const shuffle = <T,>(arr: T[]) => [...arr].sort(() => 0.5 - Math.random());

const parseJsonBody = async (req: any) => {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string" && req.body.trim().length > 0) {
    return JSON.parse(req.body);
  }

  const raw = await new Promise<string>((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });

  if (!raw.trim()) {
    return null;
  }

  return JSON.parse(raw);
};

export default async function handler(req: any, res: any) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: "Supabase env vars missing" });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await parseJsonBody(req);
    const emojis = body?.emojis;

    if (!Array.isArray(emojis) || emojis.length !== 3) {
      return res.status(400).json({ error: "Exactly 3 emojis required" });
    }

    const { data: climates, error: climateError } = await supabase
      .from("emoji_climate_weights")
      .select("climate, weight")
      .in("emoji", emojis);

    if (climateError || !climates?.length) {
      return res.status(400).json({ error: "No climate data" });
    }

    const scores: Record<string, number> = {};
    (climates as ClimateWeight[]).forEach(entry => {
      const weight = Number(entry.weight);
      scores[entry.climate] = (scores[entry.climate] || 0) + weight;
    });

    const climate = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0];

    if (!climate) {
      return res.status(400).json({ error: "No dominant climate" });
    }

    const { data: assets, error: assetError } = await supabase
      .from("media_assets")
      .select("path, category")
      .eq("enabled", true)
      .eq("climate", climate);

    if (assetError || !assets?.length) {
      return res.status(400).json({ error: "No media for climate" });
    }

    const byCategory = (category: string) =>
      shuffle((assets as MediaAsset[]).filter(asset => asset.category === category));

    return res.status(200).json({
      emojis,
      climate,
      media: {
        music: byCategory("music")[0]?.path ?? null,
        video: byCategory("video")[0]?.path ?? null,
        shader: byCategory("shader")[0]?.path ?? null,
        text: byCategory("text")[0]?.path ?? null,
        voices: byCategory("voice").slice(0, 3).map(asset => asset.path)
      },
      oracle: {
        text: `${emojis.join(" · ")} — Une traversée se met en mouvement.`
      }
    });
  } catch (err) {
    console.error("[compose error]", err);
    return res.status(500).json({ error: "compose failed" });
  }
}
