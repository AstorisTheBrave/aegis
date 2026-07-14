import { evaluateReviewPolicy, type PolicyEvaluation } from '@aegis/review-policies';
import type { DiscoveryManager } from './discovery.js';

export class DiscoveryReviewPolicyManager {
  constructor(
    private readonly discovery: DiscoveryManager,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(tenantId: string): Promise<readonly PolicyEvaluation[]> {
    const [applications, queue] = await Promise.all([
      this.discovery.listCatalog(tenantId),
      this.discovery.listQueue(tenantId),
    ]);
    const observedAt = this.now().toISOString();
    return [
      ...applications.map((application) =>
        evaluateReviewPolicy(
          'application-owner.v1',
          {
            id: application.id,
            tenantId,
            kind: 'application',
            displayName: application.vendorName,
            owners: application.owners.map((owner) => owner.identityId),
            sourceReferences: application.domains,
          },
          observedAt,
        ),
      ),
      ...queue
        .filter(
          (item) => item.observation.identityType && item.observation.identityType !== 'human',
        )
        .map((item) =>
          evaluateReviewPolicy(
            'non-human-identity.v1',
            {
              id: item.observation.id,
              tenantId,
              kind: 'non_human_identity',
              displayName: item.observation.vendorName,
              owners: item.application?.owners.map((owner) => owner.identityId) ?? [],
              sourceReferences: [item.observation.sourceReference],
              identityType: item.observation.identityType as Exclude<
                typeof item.observation.identityType,
                'human'
              >,
            },
            observedAt,
          ),
        ),
    ];
  }
}
