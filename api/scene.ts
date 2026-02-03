import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildScene } from "../src/engine/buildScene";
import { SceneRequest } from "../src/types/scene";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const payload = req.body as SceneRequest;
  if (!payload || !Array.isArray(payload.emojis)) {
    return res.status(400).json({ error: "emojis array is required" });
  }

  try {
    const scene = await buildScene(payload);
    return res.status(200).json(scene);
  } catch (error) {
    console.error("[scene]", error);
    return res.status(500).json({ error: "failed to build scene" });
  }
}
