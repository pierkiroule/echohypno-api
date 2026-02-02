import { Router } from "express";
import { clearCatalogCache } from "../engine/loadCatalog";

export const adminRouter = Router();

adminRouter.post("/admin/cache/clear", (_req, res) => {
  clearCatalogCache();
  return res.json({ cleared: true });
});
