const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  try {
    /* ---------- BUCKET ---------- */
    const folders = ["music", "video", "voice", "text", "shaders"];
    const bucketFiles = {};

    for (const folder of folders) {
      const { data, error } = await supabase
        .storage
        .from("scenes-media")
        .list(folder, { limit: 500 });

      if (error) throw error;
      bucketFiles[folder] = (data || []).map(f => `${folder}/${f.name}`);
    }

    /* ---------- MEDIA SEMANTICS ---------- */
    const { data: semantics } = await supabase
      .from("media_semantics")
      .select("path, category, enabled");

    /* ---------- EMOJI MEDIA ---------- */
    const { data: emojiMedia } = await supabase
      .from("emoji_media")
      .select("emoji, media_path, enabled");

    /* ---------- ANALYSE ---------- */
    const semanticPaths = new Set(
      (semantics || []).map(m => m.path)
    );

    const orphanFiles = [];
    for (const files of Object.values(bucketFiles)) {
      for (const path of files) {
        if (!semanticPaths.has(path)) {
          orphanFiles.push(path);
        }
      }
    }

    res.status(200).json({
      ok: true,

      counts: {
        bucket_files: orphanFiles.length + semanticPaths.size,
        media_semantics: semantics?.length || 0,
        emoji_media: emojiMedia?.length || 0,
        orphan_files: orphanFiles.length
      },

      orphan_files: orphanFiles.slice(0, 50), // limite volontaire

      notes: [
        "orphan_files = fichiers présents dans le bucket mais absents de media_semantics",
        "Seuls media_semantics.enabled=true sont utilisés par compose"
      ]
    });

  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e.message
    });
  }
};
