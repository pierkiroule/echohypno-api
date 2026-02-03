const { createClient } = require("@supabase/supabase-js");

/* -------------------------------------------------- */
/* SUPABASE CLIENT                                    */
/* -------------------------------------------------- */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SUPABASE_PUBLIC_BASE =
  `${process.env.SUPABASE_URL}/storage/v1/object/public/scenes-media/`;

const toPublicUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return SUPABASE_PUBLIC_BASE + path.replace(/^\/+/, "");
};

/* -------------------------------------------------- */
/* UTILS                                              */
/* -------------------------------------------------- */

function weightedPick(items) {
  if (!items.length) return null;
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    if ((r -= item.weight) <= 0) return item;
  }
  return items[items.length - 1];
}

/* -------------------------------------------------- */
/* API HANDLER                                        */
/* -------------------------------------------------- */

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const { emojis = [] } = req.body;

    if (!Array.isArray(emojis) || emojis.length === 0) {
      return res.status(400).json({ error: "emojis required" });
    }

    /* -------------------------------------------------- */
    /* LOAD DATA                                          */
    /* -------------------------------------------------- */

    const [{ data: semantics }, { data: emojiMedia }] = await Promise.all([
      supabase.from("media_semantics").select("*").eq("enabled", true),
      supabase.from("emoji_media").select("*").eq("enabled", true)
    ]);

    /* -------------------------------------------------- */
    /* SCORE MEDIA BY EMOJI                               */
    /* -------------------------------------------------- */

    const emojiIndex = {};

    for (const row of emojiMedia || []) {
      if (!emojis.includes(row.emoji)) continue;
      if (!emojiIndex[row.media_path]) emojiIndex[row.media_path] = 0;
      emojiIndex[row.media_path] += row.intensity || 1;
    }

    const scored = (semantics || [])
      .filter((m) => emojiIndex[m.path])
      .map((m) => ({
        ...m,
        weight: emojiIndex[m.path] + Math.random()
      }));

    const pickCategory = (category) =>
      weightedPick(scored.filter((m) => m.category === category));

    /* -------------------------------------------------- */
    /* PICKS                                              */
    /* -------------------------------------------------- */

    const music = pickCategory("music");
    const video = pickCategory("video");
    const shader = pickCategory("shader");
    const text = pickCategory("text");
    const voices = scored.filter((m) => m.category === "voice").slice(0, 3);

    const seed = Date.now();

    /* -------------------------------------------------- */
    /* RESPONSE                                           */
    /* -------------------------------------------------- */

    res.status(200).json({
      id: `scene-${Math.random().toString(16).slice(2)}`,
      seed,
      emojis,
      intensity: Math.random(),
      media: {
        music: toPublicUrl(music?.path),
        video: toPublicUrl(video?.path),
        shader: toPublicUrl(shader?.path),
        text: toPublicUrl(text?.path),
        voices: voices.map((v) => toPublicUrl(v.path))
      },
      oracle: {
        text: `${emojis.join(" ")} — Ce qui résonne cherche un passage.`
      }
    });

  } catch (e) {
    console.error("[compose error]", e);
    res.status(500).json({ error: "compose failed" });
  }
};
