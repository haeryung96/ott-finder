import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // "@/..." 경로를 tsconfig.json 의 paths 에서 그대로 읽는다.
  // (vite-tsconfig-paths 플러그인은 Vite 가 이 옵션을 내장한 뒤로 불필요)
  resolve: { tsconfigPaths: true },
  test: {
    // 순수 함수 테스트에는 DOM 이 필요 없지만 컴포넌트 회귀 테스트
    // (BestValueLine, ResultCard) 가 있어서 전체를 jsdom 으로 돌린다.
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    globals: true,
  },
});
