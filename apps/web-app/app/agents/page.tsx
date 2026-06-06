'use client';

import { id } from '@instantdb/react';
import db from '@repo/db/client';
import { useState } from 'react';
import { DateTime } from 'luxon';
import Agent from '@/components/Agent';

export default function AgentsPage() {

  const [name, setName] = useState('');
  const [auth, setAuth] = useState('');

  const { data, isLoading, error } = db.useQuery({
    agents: {}
  });

  const agents = data?.agents;

  const createAgent = async () => {
    const agentId = id();
    await db.transact(
      db.tx.agents[agentId]!.create({
        name,
        createdAt: DateTime.now().toISO(),
        status: 'creating',
        auth: JSON.parse(auth)
      }),
    );
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!agents) return <div>No agents found</div>;

  return <div>
    <h1>Agents</h1>
    <ul>
      {agents.map((agent) => <Agent key={agent.id} agent={agent} />)}
    </ul>

    <div className='flex flex-col gap-4'>
      <h2>Create Agent</h2>
      <input type='text' placeholder='Name' value={name} onChange={(e) => setName(e.target.value)} />
      <input type='text' placeholder='auth' value={auth} onChange={(e) => setAuth(e.target.value)} />
      <button onClick={() => {
        createAgent();
      }}>Create</button>
    </div>
  </div>;
}