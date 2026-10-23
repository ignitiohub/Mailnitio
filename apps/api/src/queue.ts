import { PgBoss } from "pg-boss";

type CreateQueueOptions = NonNullable<Parameters<PgBoss["createQueue"]>[1]>;

export interface JobQueue {
  send(name: string, data: object, options?: { singletonKey?: string }): Promise<string | null>;
  stop(): Promise<void>;
}

/**
 * pg-boss producer. Queues are created if missing (with their options, so retry and dead-letter policy
 * is the same whichever service starts first). Retry policy comes from the queue, not the sender.
 */
export async function createJobQueue(
  connectionString: string,
  queues: { name: string; options?: CreateQueueOptions }[],
): Promise<JobQueue> {
  const boss = new PgBoss({ connectionString, schema: "pgboss", supervise: false, schedule: false });
  await boss.start();
  for (const queue of queues) {
    if (queue.options?.deadLetter) await boss.createQueue(queue.options.deadLetter);
    await boss.createQueue(queue.name, queue.options);
  }
  return {
    send: (name, data, options) => boss.send(name, data, options),
    stop: () => boss.stop({ graceful: true }),
  };
}
