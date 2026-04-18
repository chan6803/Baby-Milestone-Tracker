import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DIST = join(__dirname, "artifacts/mapagi/dist");

// ── PWA 필수 MIME 타입 등록 ──────────────────────────────────────
// Express 기본 mime 라이브러리가 .webmanifest를 모를 수 있어서 명시 등록
express.static.mime.define({
  "application/manifest+json": ["webmanifest"],
  "text/javascript": ["js"],
});

// ── 정적 파일 서빙 (캐시 헤더 포함) ─────────────────────────────
app.use(
  express.static(DIST, {
    setHeaders(res, filePath) {
      // 매니페스트: 캐시 안 함 (PWABuilder/브라우저가 항상 최신을 읽도록)
      if (filePath.endsWith(".webmanifest") || filePath.endsWith("manifest.json")) {
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
      }
      // 서비스워커: 캐시 안 함
      if (filePath.endsWith("sw.js") || filePath.endsWith("service-worker.js")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  })
);

// ── 매니페스트 명시적 라우트 (static이 못 잡을 경우 보험) ────────
app.get("/manifest.webmanifest", (req, res) => {
  res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(join(DIST, "manifest.webmanifest"), (err) => {
    if (err) res.status(404).json({ error: "manifest not found" });
  });
});

// ── SPA 폴백 – 위에서 못 잡은 모든 경로는 index.html ───────────
app.get("*", (req, res) => {
  res.sendFile(join(DIST, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🍼 마빠기 서버 실행 중: http://0.0.0.0:${PORT}`);
});
