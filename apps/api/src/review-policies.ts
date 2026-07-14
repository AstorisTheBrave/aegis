import { evaluateReviewPolicy, type PolicyEvaluation } from '@aegis/review-policies';
import type { DiscoveryManager } from './discovery.js';

export class DiscoveryReviewPolicyManager {
  constructor(private readonly discovery: DiscoveryManager) {}

  async list(tenantId: string): Promise<readonly PolicyEvaluation[]> {
    const [applications, queue] = await Promise.all([
      this.discovery.listCatalog(tenantId),
      this.discovery.listQueue(tenantId),
    ]);
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
            sourceReferences: applicationEvidenceReferences(application),
            sourceEvidence: applicationEvidenceReferences(application).map((sourceReference) => ({
              sourceReference,
              observedAt: application.updatedAt,
            })),
          },
          application.updatedAt,
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
              sourceEvidence: [
                {
                  sourceReference: item.observation.sourceReference,
                  observedAt: item.observation.observedAt,
                },
              ],
              identityType: item.observation.identityType as Exclude<
                typeof item.observation.identityType,
                'human'
              >,
            },
            item.observation.observedAt,
          ),
        ),
    ];
  }
}

function applicationEvidenceReferences(application: {
  readonly id: string;
  readonly domains: readonly string[];
  readonly aliases: readonly string[];
}): readonly string[] {
  const references = [...application.domains, ...application.aliases];
  return references.length ? references : [`catalog:${application.id}`];
}
