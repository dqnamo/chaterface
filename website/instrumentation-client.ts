import posthog from "posthog-js";

const posthogToken = process.env.NEXT_PUBLIC_POSTHOG_TOKEN;

if (posthogToken) {
  posthog.init(posthogToken, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    defaults: "2026-01-30",
  });
}
