import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildDiagnostics } from "../src/engine/diagnostics";

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse,
) {
  try {
    const report = await buildDiagnostics();
    res.status(200).json(report);
  } catch (error) {
    console.error("[diagnostics]", error);
    res.status(500).json({ error: "failed to fetch diagnostics" });
  }
}
