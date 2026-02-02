import { Router } from "express";
import { buildScene } from "../engine/buildScene";
import { SceneRequest } from "../types/scene";

export const sceneRouter = Router();

sceneRouter.post("/scene", async (req, res) => {
  const payload = req.body as SceneRequest;
  if (!payload || !Array.isArray(payload.emojis)) {
    return res.status(400).json({ error: "emojis array is required" });
  }

  try {
    const scene = await buildScene(payload);
    return res.json(scene);
  } catch (error) {
    console.error("[scene]", error);
    return res.status(500).json({ error: "failed to build scene" });
  }
});
