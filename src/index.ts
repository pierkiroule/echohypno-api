import express from "express";
import { sceneRouter } from "./routes/scene";
import { diagnosticsRouter } from "./routes/diagnostics";
import { adminRouter } from "./routes/admin";

const app = express();

app.use(express.json({ limit: "256kb" }));
app.use(sceneRouter);
app.use(diagnosticsRouter);
app.use(adminRouter);

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

const port = Number(process.env.PORT ?? 3000);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`[echohypno-api] listening on ${port}`);
  });
}

export default app;
