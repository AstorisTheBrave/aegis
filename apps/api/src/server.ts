import { InMemoryAccessGraphRepository } from '@open-saas-governance/access-graph';
import { createApp } from './app.js';
const app = createApp(new InMemoryAccessGraphRepository());
await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 3000) });
