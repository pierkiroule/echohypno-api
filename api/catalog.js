const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  try {
    // 1. Bucket
    const { data: bucket, error: bucketError } =
      await supabase.storage.from("scenes-media").list("", { limit: 100 });

    if (bucketError) throw bucketError;

    // 2. Tables
    const { data: mediaSemantics, error: semError } =
      await supabase.from("media_semantics").select("*");

    if (semError) throw semError;

    const { data: emojiMedia, error: emojiError } =
      await supabase.from("emoji_media").select("*");

    if (emojiError) throw emojiError;

    res.status(200).json({
      ok: true,
      bucket: bucket.map(f => f.name),
      counts: {
        media_semantics: mediaSemantics.length,
        emoji_media: emojiMedia.length
      },
      media_semantics: mediaSemantics,
      emoji_media: emojiMedia
    });

  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e.message
    });
  }
};
