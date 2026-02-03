import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearCatalogCache } from "../../../src/engine/loadCatalog";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  clearCatalogCache();
  res.status(200).json({ cleared: true });
}
