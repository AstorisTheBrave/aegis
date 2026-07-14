import { createRuntime } from './runtime.js';

const runtime = await createRuntime();
await runtime.app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 3000) });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void runtime.close().then(() => process.exit(0));
  });
}
