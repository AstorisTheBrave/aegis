import type { FindingDetail, FindingListItem } from '@aegis/api-contract';
import { evaluateGitHubPolicyPack } from '@aegis/findings';
import type { AccessGraphRepository, JsonValue } from '@open-saas-governance/access-graph';

export interface FindingReader {
  list(tenantId: string): Promise<readonly FindingListItem[]>;
  get(tenantId: string, findingId: string): Promise<FindingDetail | undefined>;
}

export class GraphFindingReader implements FindingReader {
  constructor(
    private readonly graph: AccessGraphRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(tenantId: string): Promise<readonly FindingListItem[]> {
    const details = await this.details(tenantId);
    return details.map((finding) => ({
      id: finding.id,
      type: finding.policy,
      severity: finding.severity,
      title: finding.title,
      identity: finding.identity,
      resource: finding.resource,
      lastSeen: finding.lastSeen,
      status: finding.status,
    }));
  }

  async get(tenantId: string, findingId: string): Promise<FindingDetail | undefined> {
    return (await this.details(tenantId)).find((finding) => finding.id === findingId);
  }

  private async details(tenantId: string): Promise<readonly FindingDetail[]> {
    const [findings, identities, resources, access] = await Promise.all([
      evaluateGitHubPolicyPack(this.graph, tenantId, this.now()),
      this.graph.listIdentities(tenantId),
      this.graph.listResources(tenantId),
      this.graph.listAccess(tenantId),
    ]);
    return findings.map((finding) => {
      const identity = identities.find((item) => item.id === finding.subject.identityId);
      const resource = resources.find((item) => item.id === finding.subject.resourceId);
      const accessItem = access.find((item) => item.grant.id === finding.subject.grantId);
      const timestamps = finding.sourceFacts.map((fact) => fact.observedAt).sort();
      return {
        id: finding.id,
        severity: finding.severity,
        title: finding.title,
        identity: identity?.displayName ?? 'Not applicable',
        source:
          stringAttribute(identity?.attributes, 'source') ?? identity?.connectorId ?? 'GitHub',
        resource: resource?.displayName ?? 'Not applicable',
        access: accessItem?.entitlement.displayName ?? 'Not applicable',
        policy: finding.type,
        firstSeen: timestamps[0] ?? '',
        lastSeen: timestamps.at(-1) ?? '',
        status: 'open' as const,
        evidence: finding.sourceFacts.map((fact) => ({
          id: fact.id,
          kind: fact.kind,
          title: fact.label,
          detail: `${fact.id} observed ${fact.observedAt}`,
        })),
      };
    });
  }
}

function stringAttribute(
  attributes: Readonly<Record<string, JsonValue>> | undefined,
  key: string,
): string | undefined {
  const value = attributes?.[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}
