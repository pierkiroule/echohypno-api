const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// tirage pondéré simple
function weightedPick(items) {
  if (!items.length) return null;
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    if ((r -= item.weight) <= 0) return item;
  }
  return items[items.length - 1];
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const { emojis = [] } = req.body;
    if (!Array.isArray(emojis) || emojis.length === 0) {
      return res.status(400).json({ error: "emojis required" });
    }

    // 1. charger tables
    const [{ data: semantics }, { data: emojiMedia }] = await Promise.all([
      supabase.from("media_semantics").select("*").eq("enabled", true),
      supabase.from("emoji_media").select("*").eq("enabled", true)
    ]);

    // index emoji → médias
    const emojiIndex = {};
    for (const row of emojiMedia) {
      if (!emojis.includes(row.emoji)) continue;
      if (!emojiIndex[row.media_path]) emojiIndex[row.media_path] = 0;
      emojiIndex[row.media_path] += row.intensity || 1;
    }

    // fusion + score
    const scored = semantics
      .filter(m => emojiIndex[m.path])
      .map(m => ({
        ...m,
        weight: emojiIndex[m.path] + Math.random()
      }));

    // helper par catégorie
    const pickCategory = (category) =>
      weightedPick(scored.filter(m => m.category === category));

    const music = pickCategory("music");
    const video = pickCategory("video");
    const shader = pickCategory("shader");
    const text = pickCategory("text");
    const voices = scored.filter(m => m.category === "voice").slice(0, 2);

    const seed = Date.now();

    res.status(200).json({
      id: `scene-${Math.random().toString(16).slice(2)}`,
      seed,
      emojis,
      intensity: Math.random(),
      media: {
        music: music?.path || null,
        video: video?.path || null,
        shader: shader?.path || null,
        text: text?.path || null,
        voices: voices.map(v => v.path)
      },
      oracle: {
        text: `${emojis.join(" ")} — Ce qui résonne cherche un passage.`
      }
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "compose failed" });
  }
};
