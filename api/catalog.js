const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  try {
    const { data, error } = await supabase
      .storage
      .from("scenes-media")
      .list("", { limit: 100 });

    if (error) throw error;

    res.status(200).json({
      ok: true,
      bucket: "scenes-media",
      files: data.map(f => f.name)
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e.message
    });
  }
};
