const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  try {
    // -------- BUCKET --------
    const folders = ["music", "video", "voice", "text", "shaders"];
    const bucketContent = {};

    for (const folder of folders) {
      const { data, error } = await supabase
        .storage
        .from("scenes-media")
        .list(folder, { limit: 200 });

      if (error) throw error;
      bucketContent[folder] = data.map(f => f.name);
    }

    // -------- TABLES --------
    const { data: mediaSemantics, error: semError } =
      await supabase.from("media_semantics").select("*");

    if (semError) throw semError;

    const { data: emojiMedia, error: emojiError } =
      await supabase.from("emoji_media").select("*");

    if (emojiError) throw emojiError;

    res.status(200).json({
      ok: true,
      bucket: "scenes-media",
      files: bucketContent,
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
