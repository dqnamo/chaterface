import { tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";
import type { helloWorldTask } from "@/jobs/example";

export async function GET() {
  const handle = await tasks.trigger<typeof helloWorldTask>("hello-world", {
    name: "Factory",
  });

  return NextResponse.json(handle);
}
