import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: [
    "**/__tests__/unit/**/*.test.ts",
    "**/__tests__/unit/**/*.test.tsx",
    "**/__tests__/integration/**/*.test.ts",
    "**/__tests__/integration/**/*.test.tsx",
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};

export default createJestConfig(config);
