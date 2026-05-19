import { task } from "@trigger.dev/sdk";

export const helloWorldTask = task({
  id: "hello-world",
  run: async (payload: { name: string }) => {
    return {
      message: `Hello ${payload.name}`,
      timestamp: new Date().toISOString(),
    };
  },
});
