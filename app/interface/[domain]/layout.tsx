import { TenantWrapper } from "./TenantWrapper";

export default function Layout({
  params,
  children,
}: {
  params: Promise<{ domain: string }>;
  children: React.ReactNode;
}) {
  return <TenantWrapper params={params}>{children}</TenantWrapper>;
}
