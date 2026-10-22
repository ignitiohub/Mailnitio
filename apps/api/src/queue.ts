import { PgBoss } from "pg-boss";

export interface JobQueue {
  send(name: string, data: object, options?: { singletonKey?: string }): Promise<string | null>;
  stop(): Promise<void>;
}

/** pg-boss producer. Queues are created by the worker on start; sending is safe before that. */
export async function createJobQueue(connectionString: string, queues: string[]): Promise<JobQueue> {
  const boss = new PgBoss({ connectionString, schema: "pgboss", supervise: false, schedule: false });
  await boss.start();
  for (const name of queues) {
    await boss.createQueue(name);
  }
  return {
    send: (name, data, options) => boss.send(name, data, { ...options, retryLimit: 5, retryBackoff: true }),
    stop: () => boss.stop({ graceful: true }),
  };
}
