"use client";
import { init } from "@instantdb/react";
import schema from "@/instant.schema";
import { use, useEffect, useState } from "react";
import { TenantDataProvider } from "@/app/providers/TenantDataProvider";
import TenantSidebar from "@/app/components/TenantSidebar";

const db = init({ appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!, schema });

export function TenantWrapper({
  params,
  children,
}: {
  params: Promise<{ domain: string }>;
  children: React.ReactNode;
}) {
  const { domain } = use(params);

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

  let subdomain = "";
  if (domain.endsWith(`.${rootDomain}`)) {
    subdomain = domain.replace(`.${rootDomain}`, "");
  }

  const { isLoading, error, data } = db.useQuery({
    interfaces: {
      $: {
        where: { subdomain: subdomain || domain },
      },
    },
  });

  if (isLoading) return <div>Loading Interface...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const iface = data?.interfaces?.[0];

  if (!iface) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-xl font-bold">Interface Not Found</h1>
          <p className="text-gray-500">
            The interface {subdomain || domain} does not exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TenantDataProvider interfaceId={iface.id}>
      <div className="relative h-dvh">
        <TenantSidebar />
        <div className="flex flex-col h-full w-full max-w-4xl mx-auto pl-0 md:pl-64">
          {children}
        </div>
      </div>
    </TenantDataProvider>
  );
}
