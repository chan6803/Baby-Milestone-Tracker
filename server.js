import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createServer } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DIST = join(__dirname, "artifacts/mapagi/dist");

// ── PWA 매니페스트 및 서비스워커 전용 라우트 ──────────────────────
// SPA 폴백보다 먼저 처리해야 함
app.get("/manifest.webmanifest", (req, res) => {
  res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.sendFile(join(DIST, "manifest.webmanifest"), (err) => {
    if (err) {
      console.error("manifest.webmanifest not found:", err.message);
      res.status(404).send("manifest not found");
    }
  });
});

app.get("/sw.js", (req, res) => {
  res.setHeader("Content-Type", "text/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.sendFile(join(DIST, "sw.js"), (err) => {
    if (err) res.status(404).send("sw not found");
  });
});

// ── 헬스체크 엔드포인트 ──────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// ── 정적 파일 서빙 ───────────────────────────────────────────────
app.use(express.static(DIST));

// ── SPA 폴백 – 위에서 못 잡은 모든 경로는 index.html ───────────
app.get("*", (req, res) => {
  res.sendFile(join(DIST, "index.html"));
});

// ── 서버 시작 ────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`마빠기 서버 실행 중: http://0.0.0.0:${PORT}`);
});
