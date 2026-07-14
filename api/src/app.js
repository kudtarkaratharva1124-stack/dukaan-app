import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { notFoundMiddleware, errorMiddleware } from "./middleware/error.middleware.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(compression());
// 6mb covers base64-encoded product/invoice photos from the AI routes (images are
// resized client-side to max 1024px before upload, so this is a safety ceiling, not
// the expected size).
app.use(express.json({ limit: "6mb" }));
app.use(express.urlencoded({ extended: true }));
if (env.nodeEnv !== "test") app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

app.use(
  "/api",
  rateLimit({ windowMs: env.rateLimitWindowMs, max: env.rateLimitMax, standardHeaders: true, legacyHeaders: false })
);

app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.use("/api", routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
