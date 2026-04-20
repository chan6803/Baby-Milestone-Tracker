# ================================================================
# 마빠기 앱 Railway 배포용 Dockerfile
# ================================================================

# Node.js 20 (LTS) 사용 - Debian 기반 (안정적)
FROM node:20-slim

WORKDIR /app

# ── pnpm 설치 ────────────────────────────────────────────────────
# corepack은 Node.js 20에 기본 포함 → pnpm을 PATH에 자동 등록
RUN corepack enable && corepack prepare pnpm@9 --activate

# ── 소스 코드 복사 ───────────────────────────────────────────────
COPY . .

# ── 의존성 설치 ──────────────────────────────────────────────────
# --ignore-scripts     : Replit 전용 postinstall 스크립트 오류 방지
# --frozen-lockfile=false : lockfile 버전 불일치 허용
# --config.minimumReleaseAge=0 : pnpm-workspace.yaml의 1440분 대기 규칙 무력화
RUN pnpm install \
      --frozen-lockfile=false \
      --ignore-scripts \
      --config.minimumReleaseAge=0

# ── 마빠기 앱 빌드 ───────────────────────────────────────────────
# NODE_OPTIONS: 빌드 중 메모리 부족 방지 (1GB 제한)
RUN NODE_OPTIONS="--max-old-space-size=1024" \
    pnpm --filter @workspace/mapagi run build:railway

# ── 서버 실행 ────────────────────────────────────────────────────
EXPOSE $PORT
CMD ["node", "server.js"]
