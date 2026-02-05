import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error("Supabase env vars missing");
}

const supabase = createClient(supabaseUrl, serviceKey);

const shuffle = <T,>(arr: T[]) => [...arr].sort(() => 0.5 - Math.random());

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { emojis } = body;

    if (!Array.isArray(emojis) || emojis.length !== 3) {
      return NextResponse.json(
        { error: "Exactly 3 emojis required" },
        { status: 400 }
      );
    }

    /* 1. CLIMAT */
    const { data: climates, error: climateError } = await supabase
      .from("emoji_climate_weights")
      .select("climate, weight")
      .in("emoji", emojis);

    if (climateError || !climates?.length) {
      return NextResponse.json(
        { error: "No climate data" },
        { status: 400 }
      );
    }

    const scores: Record<string, number> = {};
    climates.forEach(c => {
      scores[c.climate] = (scores[c.climate] || 0) + Number(c.weight);
    });

    const climate = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];

    /* 2. MÉDIAS */
    const { data: assets } = await supabase
      .from("media_assets")
      .select("path, category")
      .eq("enabled", true)
      .eq("climate", climate);

    if (!assets?.length) {
      return NextResponse.json(
        { error: "No media for climate" },
        { status: 400 }
      );
    }

    const byCat = (c: string) =>
      shuffle(assets.filter(a => a.category === c));

    return NextResponse.json({
      emojis,
      climate,
      media: {
        music: byCat("music")[0]?.path ?? null,
        video: byCat("video")[0]?.path ?? null,
        shader: byCat("shader")[0]?.path ?? null,
        text: byCat("text")[0]?.path ?? null,
        voices: byCat("voice").slice(0, 3).map(v => v.path)
      },
      oracle: {
        text: `${emojis.join(" · ")} — Une traversée se met en mouvement.`
      }
    });

  } catch (err) {
    console.error("[compose error]", err);
    return NextResponse.json(
      { error: "compose failed" },
      { status: 500 }
    );
  }
}
