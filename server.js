import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DIST = join(__dirname, "artifacts/mapagi/dist");

// Serve static files from the dist folder
app.use(express.static(DIST));

// SPA fallback – all routes serve index.html
app.get("*", (req, res) => {
  res.sendFile(join(DIST, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🍼 마빠기 서버 실행 중: http://0.0.0.0:${PORT}`);
});
