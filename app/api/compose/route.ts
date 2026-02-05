import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const shuffle = <T,>(arr: T[]) => [...arr].sort(() => 0.5 - Math.random());

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const emojis = body?.emojis;

    if (
      !Array.isArray(emojis) ||
      emojis.length !== 3 ||
      emojis.some((emoji) => typeof emoji !== "string" || emoji.trim().length === 0)
    ) {
      return NextResponse.json({ error: "Exactly 3 valid emojis required" }, { status: 400 });
    }

    /* 1. CLIMAT */
    const { data: climates, error: climateError } = await supabase
      .from("emoji_climate_weights")
      .select("climate, weight")
      .in("emoji", emojis);

    if (climateError || !climates?.length) {
      return NextResponse.json({ error: "No climate data" }, { status: 400 });
    }

    const scores: Record<string, number> = {};
    climates.forEach((entry) => {
      scores[entry.climate] = (scores[entry.climate] || 0) + Number(entry.weight);
    });

    const sortedClimates = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const climate = sortedClimates[0]?.[0];

    if (!climate) {
      return NextResponse.json({ error: "Unable to compute climate" }, { status: 400 });
    }

    /* 2. MÉDIAS */
    const { data: assets, error: assetsError } = await supabase
      .from("media_assets")
      .select("path, category")
      .eq("enabled", true)
      .eq("climate", climate);

    if (assetsError || !assets?.length) {
      return NextResponse.json({ error: "No media for climate" }, { status: 400 });
    }

    const byCat = (category: string) => shuffle(assets.filter((asset) => asset.category === category));

    return NextResponse.json({
      emojis,
      climate,
      media: {
        music: byCat("music")[0]?.path ?? null,
        video: byCat("video")[0]?.path ?? null,
        shader: byCat("shader")[0]?.path ?? null,
        text: byCat("text")[0]?.path ?? null,
        voices: byCat("voice")
          .slice(0, 3)
          .map((voice) => voice.path),
      },
      oracle: {
        text: `${emojis.join(" · ")}`,
      },
    });
  } catch (err) {
    console.error("[compose error]", err);
    return NextResponse.json({ error: "compose failed" }, { status: 500 });
  }
}
