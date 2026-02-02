import { Router } from "express";
import { buildDiagnostics } from "../engine/diagnostics";

export const diagnosticsRouter = Router();

diagnosticsRouter.get("/diagnostics", async (_req, res) => {
  try {
    const report = await buildDiagnostics();
    return res.json(report);
  } catch (error) {
    console.error("[diagnostics]", error);
    return res.status(500).json({ error: "failed to fetch diagnostics" });
  }
});
