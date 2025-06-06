import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_flwupbfthuqxvhpcclmp",
  logLevel: "log",
  maxDuration: 300, // 5 minutes for browser automation
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./src/trigger"],
});
