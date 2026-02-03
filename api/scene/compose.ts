import type { VercelRequest, VercelResponse } from "@vercel/node";

const pick = <T>(items: T[]) =>
  items[Math.floor(Math.random() * items.length)];

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const now = Date.now();
  const emojis = ["🌑", "🌊", "🔥", "🌿", "✨", "🫧", "🌀"];
  const triad = [pick(emojis), pick(emojis), pick(emojis)];

  const scene = {
    id: `scene-${now}`,
    createdAt: new Date(now).toISOString(),
    triad,
    layers: {
      text: { role: "chapeau", intensity: Math.random() },
      music: { role: "ambiance", duration: 60 + Math.random() * 60 },
      video: { role: "background", opacity: 0.3 },
      voice: {
        role: "punctuation",
        count: 1 + Math.floor(Math.random() * 3),
      },
      shader: { role: "overlay", energy: Math.random() },
    },
  };

  res.status(200).json(scene);
}
