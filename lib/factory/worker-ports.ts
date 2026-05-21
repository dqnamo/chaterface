import "server-only";

import { id } from "@instantdb/admin";
import { getAdminDbCore } from "@/lib/admin-db-core";

export type PublicUrlRecord = {
  password?: string;
  port: number;
  token?: string;
  url: string;
  username?: string;
};

type PortRecord = {
  createdAt: string;
  id: string;
  port: number;
  url: string;
  workerIdPort: string;
};

export async function syncWorkerPorts(
  workerId: string,
  publicUrls: PublicUrlRecord[],
) {
  const livePorts = new Set(publicUrls.map((publicUrl) => publicUrl.port));
  const existingPorts = await listWorkerPorts(workerId);

  for (const publicUrl of publicUrls) {
    await upsertWorkerPort({
      authType: getPublicUrlAuthType(publicUrl),
      port: publicUrl.port,
      url: publicUrl.url,
      workerId,
    });
  }

  for (const existingPort of existingPorts) {
    if (!livePorts.has(existingPort.port)) {
      await deletePortRecord(existingPort.id);
    }
  }
}

export async function upsertWorkerPort({
  authType,
  port,
  url,
  workerId,
}: {
  authType?: string;
  port: number;
  url: string;
  workerId: string;
}) {
  const db = getAdminDbCore();
  const now = new Date().toISOString();
  const workerIdPort = getWorkerPortKey(workerId, port);
  const existingPort = await getPortByWorkerIdPort(workerIdPort);
  const portId = existingPort?.id ?? id();

  await db.transact([
    db.tx.ports[portId].update({
      authType,
      createdAt: existingPort?.createdAt ?? now,
      port,
      updatedAt: now,
      url,
      workerIdPort,
    }),
    db.tx.ports[portId].link({ worker: workerId }),
  ]);
}

export async function deleteWorkerPort(workerId: string, port: number) {
  const existingPort = await getPortByWorkerIdPort(
    getWorkerPortKey(workerId, port),
  );

  if (existingPort) {
    await deletePortRecord(existingPort.id);
  }
}

export function getPublicUrlAuthType(publicUrl: PublicUrlRecord) {
  if (publicUrl.token) {
    return "bearer_token";
  }

  if (publicUrl.username || publicUrl.password) {
    return "basic_auth";
  }

  return "none";
}

async function deletePortRecord(portId: string) {
  const db = getAdminDbCore();

  await db.transact(db.tx.ports[portId].delete());
}

async function getPortByWorkerIdPort(workerIdPort: string) {
  const db = getAdminDbCore();
  const result = await db.query({
    ports: {
      $: { where: { workerIdPort } },
    },
  });

  return result.ports[0] as PortRecord | undefined;
}

async function listWorkerPorts(workerId: string) {
  const db = getAdminDbCore();
  const result = await db.query({
    workers: {
      $: { where: { id: workerId } },
      ports: {},
    },
  });
  const worker = result.workers[0] as { ports?: PortRecord[] } | undefined;

  return worker?.ports ?? [];
}

function getWorkerPortKey(workerId: string, port: number) {
  return `${workerId}:${port}`;
}
