import { AppSchema } from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react';
import db from '@repo/db/client';

type Agent = InstaQLEntity<AppSchema, 'agents'>;

export default function Agent({ agent }: { agent: Agent }) {

  const deleteAgent = async () => {
    await db.transact(
      db.tx.agents[agent.id]!.delete(),
    );
  };

  return (
    <div className='flex flex-row gap-2'>
      <div className='text-sm font-medium'>{agent.name}</div>
      <div className='text-sm text-gray-500'>{agent.status}</div>
      <button onClick={() => {
        deleteAgent();
      }}>Delete</button>
    </div>
  );
}