module.exports = function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  let body = "";
  req.on("data", chunk => {
    body += chunk;
  });

  req.on("end", () => {
    let data = {};
    try {
      data = JSON.parse(body || "{}");
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }

    const emojis = Array.isArray(data.emojis) ? data.emojis : [];

    res.status(200).json({
      id: "scene-" + Math.random().toString(16).slice(2),
      seed: Date.now(),
      emojis,
      intensity: Math.random(),
      media: {
        music: "ambient-01",
        video: "loop-01",
        shader: "basic-01",
        voices: ["whisper-01"]
      },
      oracle: {
        text: emojis.join(" ") + " — Ce qui résonne cherche un passage."
      }
    });
  });
};
