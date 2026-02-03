export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const body = req.body || {};
  const emojis = Array.isArray(body.emojis) ? body.emojis : [];

  const seed = `${Date.now()}-${Math.random()}`;

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const response = {
    id: `scene-${Math.random().toString(16).slice(2, 10)}`,
    seed,
    emojis,
    intensity: Math.random(),
    media: {
      music: pick(['ambient-01', 'ambient-02', 'ambient-03']),
      video: pick(['loop-01', 'loop-02', 'loop-03', 'loop-04']),
      shader: pick(['basic-01', 'basic-02']),
      voices: Array.from(
        { length: 1 + Math.floor(Math.random() * 3) },
        () => pick(['whisper-01', 'whisper-02', 'whisper-03'])
      )
    },
    oracle: {
      text: `${emojis.join(' ')} — ${
        pick([
          'Ce qui résonne cherche un passage.',
          "L’écoute est plus vaste que le signe.",
          'Une profondeur silencieuse s’ouvre.',
          'Le mouvement précède la forme.'
        ])
      }`
    }
  };

  res.status(200).json(response);
}
