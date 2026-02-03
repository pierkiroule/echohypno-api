const { createClient } = require("@supabase/supabase-js");

/* -------------------------------------------------- */
/* CORS                                               */
/* -------------------------------------------------- */

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/* -------------------------------------------------- */
/* SUPABASE CLIENT                                    */
/* -------------------------------------------------- */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SUPABASE_PUBLIC_BASE =
  `${process.env.SUPABASE_URL}/storage/v1/object/public/scenes-media/`;

/* -------------------------------------------------- */
/* UTILS                                              */
/* -------------------------------------------------- */

const normalizeEmoji = (e) =>
  typeof e === "string"
    ? e.trim().replace(/\uFE0F/g, "")
    : "";

const toPublicUrl = (path) => {
  if (!path || typeof path !== "string") return null;
  if (path.startsWith("http")) return path;
  return SUPABASE_PUBLIC_BASE + path.replace(/^\/+/, "");
};

function weightedPick(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
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
  setCors(res);

  /* ---------- Preflight ---------- */
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    /* ---------- Safe body parsing ---------- */
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const { emojis = [] } = body;

    if (!Array.isArray(emojis) || emojis.length === 0) {
      return res.status(400).json({ error: "emojis required" });
    }

    const normalizedEmojis = emojis.map(normalizeEmoji);

    /* ---------- Load data ---------- */
    const [{ data: semantics }, { data: emojiMedia }] = await Promise.all([
      supabase.from("media_semantics").select("*").eq("enabled", true),
      supabase.from("emoji_media").select("*").eq("enabled", true)
    ]);

    /* ---------- Score by emoji ---------- */
    const emojiIndex = {};

    for (const row of emojiMedia || []) {
      if (!normalizedEmojis.includes(normalizeEmoji(row.emoji))) continue;
      if (!emojiIndex[row.media_path]) emojiIndex[row.media_path] = 0;
      emojiIndex[row.media_path] += row.intensity || 1;
    }

    const scored = (semantics || []).map((m) => ({
  ...m,
  weight: (emojiIndex[m.path] || 1) + Math.random()
}));

    /* ---------- Fallback sécurité ---------- */
    const usable =
      scored.length > 0
        ? scored
        : (semantics || []).map((m) => ({ ...m, weight: 1 }));

    const pickCategory = (category) =>
      weightedPick(usable.filter((m) => m.category === category));

    /* ---------- Picks ---------- */
    const music = pickCategory("music");
    const video = pickCategory("video");
    const shader = pickCategory("shader");
    const text = pickCategory("text");
    const voices = usable
      .filter((m) => m.category === "voice")
      .slice(0, 3);

    /* ---------- Response ---------- */
    res.status(200).json({
      id: `scene-${Math.random().toString(16).slice(2)}`,
      seed: Date.now(),
      emojis,
      intensity: Math.random(),
      media: {
        music: toPublicUrl(music?.path),
        video: toPublicUrl(video?.path),
        shader: toPublicUrl(shader?.path),
        text: toPublicUrl(text?.path),
        voices: voices.map((v) => toPublicUrl(v.path)).filter(Boolean)
      },
      oracle: {
        text: `${emojis.join(" ")} — Ce qui résonne cherche un passage.`
      }
    });

  } catch (err) {
    console.error("[compose error]", err);
    res.status(500).json({ error: "compose failed" });
  }
};
