import Card from "@/components/public/Card";
import { hasInstantConfig } from "@/lib/db.client";

export default function InstantStarter() {
  if (!hasInstantConfig) {
    return (
      <Card className="gap-3 p-4">
        <h2 className="font-medium text-grayscale-12">InstantDB</h2>
        <p className="text-sm leading-6 text-grayscale-11">
          Add <span className="font-mono">NEXT_PUBLIC_INSTANT_APP_ID</span> to
          your local env, then run the app to enable the realtime starter list.
        </p>
      </Card>
    );
  }

  return (
    <Card className="gap-4 p-4">
      <div>
        <h2 className="font-medium text-grayscale-12">InstantDB</h2>
        <p className="text-sm text-grayscale-11">
          InstantDB is configured for factories.
        </p>
      </div>
    </Card>
  );
}
