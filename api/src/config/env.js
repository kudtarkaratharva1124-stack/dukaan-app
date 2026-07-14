import "dotenv/config";

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.API_PORT || 4000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "dev_secret_change_me",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev_refresh_secret_change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 200),
  corsOrigin: process.env.CORS_ORIGIN || "*",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  barcodeLookupEnabled: process.env.BARCODE_LOOKUP_ENABLED !== "false",
  barcodeLookupTimeoutMs: Number(process.env.BARCODE_LOOKUP_TIMEOUT_MS || 5000)
};
