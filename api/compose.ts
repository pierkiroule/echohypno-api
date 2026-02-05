import { createClient } from "@supabase/supabase-js";
type ComposeResponse = {
  emojis: string[];
  climate: string;
  media: {
    music: string | null;
    video: string | null;
    shader: string | null;
    text: string | null;
    voices: string[];
  };
  oracle: {
    text: string;
  };
};

const ALLOWED_METHODS = "POST, OPTIONS";

type HttpRequest = {
  method?: string;
  body?: unknown;
};

type HttpResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => HttpResponse;
  json: (payload: unknown) => void;
  end: () => void;
};

function setCorsHeaders(res: HttpResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function jsonError(res: HttpResponse, status: number, message: string, details?: unknown): void {
  if (details) {
    console.error("[compose]", message, details);
  } else {
    console.error("[compose]", message);
  }

  res.status(status).json({ error: message });
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

export default async function handler(req: HttpRequest, res: HttpResponse): Promise<void> {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    jsonError(res, 405, "Method not allowed");
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    jsonError(res, 500, "Supabase env vars missing");
    return;
  }

  const payload = (req.body ?? {}) as { emojis?: unknown };
  const emojis = payload.emojis;

  if (
    !Array.isArray(emojis) ||
    emojis.length !== 3 ||
    emojis.some((emoji) => typeof emoji !== "string" || emoji.trim().length === 0)
  ) {
    jsonError(res, 400, "Invalid payload: emojis must be an array of exactly 3 non-empty strings");
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: climateRows, error: climateError } = await supabase
      .from("emoji_climate_weights")
      .select("climate, weight")
      .in("emoji", emojis);

    if (climateError) {
      jsonError(res, 500, "Failed to load climate weights", climateError);
      return;
    }

    if (!climateRows || climateRows.length === 0) {
      jsonError(res, 404, "No climate data found for provided emojis");
      return;
    }

    const climateScores: Record<string, number> = {};
    for (const row of climateRows) {
      const climateKey = String(row.climate);
      const weight = Number(row.weight);
      climateScores[climateKey] = (climateScores[climateKey] ?? 0) + (Number.isFinite(weight) ? weight : 0);
    }

    const dominantClimate = Object.entries(climateScores).sort((a, b) => b[1] - a[1])[0]?.[0];

    if (!dominantClimate) {
      jsonError(res, 500, "Unable to compute dominant climate");
      return;
    }

    const { data: assets, error: assetsError } = await supabase
      .from("media_assets")
      .select("path, category")
      .eq("enabled", true)
      .eq("climate", dominantClimate);

    if (assetsError) {
      jsonError(res, 500, "Failed to load media assets", assetsError);
      return;
    }

    if (!assets || assets.length === 0) {
      jsonError(res, 404, `No media assets available for climate ${dominantClimate}`);
      return;
    }

    const byCategory = (category: string) => shuffle(assets.filter((asset) => asset.category === category));

    const response: ComposeResponse = {
      emojis,
      climate: dominantClimate,
      media: {
        music: byCategory("music")[0]?.path ?? null,
        video: byCategory("video")[0]?.path ?? null,
        shader: byCategory("shader")[0]?.path ?? null,
        text: byCategory("text")[0]?.path ?? null,
        voices: byCategory("voice")
          .slice(0, 3)
          .map((voice) => voice.path),
      },
      oracle: {
        text: emojis.join(" · "),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    jsonError(res, 500, "compose failed", error);
  }
}
