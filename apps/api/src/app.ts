import Fastify from 'fastify';
import type { AccessGraphRepository } from '@open-saas-governance/access-graph';
export function createApp(graph: AccessGraphRepository) {
  const app = Fastify({ logger: true });
  app.get('/health', async () => ({ status: 'ok' }));
  app.get<{ Params: { tenantId: string; identityId: string } }>(
    '/v1/tenants/:tenantId/identities/:identityId',
    async (request, reply) => {
      const identity = await graph.getIdentity(request.params.tenantId, request.params.identityId);
      return identity ?? reply.code(404).send({ error: 'identity_not_found' });
    },
  );
  app.get<{ Params: { tenantId: string; identityId: string } }>(
    '/v1/tenants/:tenantId/identities/:identityId/access',
    async (request) =>
      graph.listAccessForIdentity(request.params.tenantId, request.params.identityId),
  );
  return app;
}
