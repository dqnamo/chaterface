import { redirect } from "next/navigation";

export default async function FactorySettingsIndexPage({
  params,
}: {
  params: Promise<{ factoryId: string }>;
}) {
  const { factoryId } = await params;

  redirect(`/factory/${factoryId}/settings/general`);
}
