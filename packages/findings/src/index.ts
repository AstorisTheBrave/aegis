import type {
  AccessGraphRepository,
  AccessView,
  Identity,
  JsonValue,
  Resource,
} from '@open-saas-governance/access-graph';

export type Severity = 'low' | 'medium' | 'high';
export type GitHubFindingType =
  | 'ORG_ADMIN'
  | 'OUTSIDE_COLLABORATOR'
  | 'STALE_ACCESS'
  | 'UNOWNED_REPOSITORY'
  | 'DIRECT_GRANT_DRIFT';
export type FindingType = GitHubFindingType | 'PRIVILEGED_ACCESS' | 'POLICY_REVIEW';

export interface FindingSourceFact {
  readonly kind: 'identity' | 'resource' | 'entitlement' | 'grant';
  readonly id: string;
  readonly observedAt: string;
  readonly label: string;
}

export interface FindingSubject {
  readonly identityId?: string;
  readonly resourceId?: string;
  readonly entitlementId?: string;
  readonly grantId?: string;
}

export interface Finding {
  readonly id: string;
  readonly type: FindingType;
  readonly severity: Severity;
  readonly ruleId: string;
  readonly title: string;
  readonly evidence: Readonly<Record<string, string>>;
  readonly sourceFacts: readonly FindingSourceFact[];
  readonly subject: FindingSubject;
}

export interface FindingRule {
  readonly id: string;
  evaluate(access: AccessView): Finding | undefined;
}

export const privilegedAccessRule: FindingRule = {
  id: 'privileged-access-v1',
  evaluate(access) {
    if (!access.entitlement.privileged) return;
    return {
      id: `${this.id}:${access.grant.id}`,
      type: 'PRIVILEGED_ACCESS',
      severity: 'high',
      ruleId: this.id,
      title: 'Privileged access requires review',
      evidence: {
        identityId: access.identity.id,
        grantId: access.grant.id,
        entitlementId: access.entitlement.id,
        resourceId: access.resource.id,
      },
      sourceFacts: accessFacts(access),
      subject: {
        identityId: access.identity.id,
        resourceId: access.resource.id,
        entitlementId: access.entitlement.id,
        grantId: access.grant.id,
      },
    };
  },
};

export function evaluateAccess(
  access: readonly AccessView[],
  rules: readonly FindingRule[] = [privilegedAccessRule],
): Finding[] {
  return access.flatMap((item) =>
    rules
      .map((rule) => rule.evaluate(item))
      .filter((finding): finding is Finding => Boolean(finding)),
  );
}

export async function evaluateGitHubPolicyPack(
  graph: AccessGraphRepository,
  tenantId: string,
  now: Date,
): Promise<readonly Finding[]> {
  const [identities, resources, access] = await Promise.all([
    graph.listIdentities(tenantId),
    graph.listResources(tenantId),
    graph.listAccess(tenantId),
  ]);
  const findings = [
    ...organizationAdminFindings(identities, access),
    ...outsideCollaboratorFindings(identities, access),
    ...staleAccessFindings(access, now),
    ...unownedRepositoryFindings(resources),
    ...directGrantFindings(access),
  ];
  return findings.sort((left, right) => left.id.localeCompare(right.id));
}

function organizationAdminFindings(
  identities: readonly Identity[],
  access: readonly AccessView[],
): Finding[] {
  return identities.flatMap((identity) => {
    if (stringAttribute(identity, 'organizationRole') !== 'admin') return [];
    const grant = access.find(
      (item) =>
        item.identity.id === identity.id &&
        item.resource.resourceType === 'organization' &&
        item.entitlement.displayName === 'admin',
    );
    const sourceFacts = [identityFact(identity), ...(grant ? accessFacts(grant).slice(1) : [])];
    return [
      finding({
        type: 'ORG_ADMIN',
        severity: 'high',
        title: 'Organization administrator requires review',
        ruleId: 'github.org-admin.v1',
        identity,
        access: grant,
        sourceFacts,
      }),
    ];
  });
}

function outsideCollaboratorFindings(
  identities: readonly Identity[],
  access: readonly AccessView[],
): Finding[] {
  return identities.flatMap((identity) => {
    if (booleanAttribute(identity, 'outsideCollaborator') !== true) return [];
    const repositoryAccess = access.filter(
      (item) => item.identity.id === identity.id && item.resource.resourceType === 'repository',
    );
    if (!repositoryAccess.length) {
      return [
        finding({
          type: 'OUTSIDE_COLLABORATOR',
          severity: 'medium',
          title: 'Outside collaborator requires review',
          ruleId: 'github.outside-collaborator.v1',
          identity,
          sourceFacts: [identityFact(identity)],
        }),
      ];
    }
    return repositoryAccess.map((item) =>
      finding({
        type: 'OUTSIDE_COLLABORATOR',
        severity: 'medium',
        title: 'Outside collaborator requires review',
        ruleId: 'github.outside-collaborator.v1',
        identity,
        access: item,
        sourceFacts: accessFacts(item),
      }),
    );
  });
}

function staleAccessFindings(access: readonly AccessView[], now: Date): Finding[] {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - 90);
  return access.flatMap((item) => {
    if (item.resource.resourceType !== 'repository') return [];
    const lastActivityAt = stringAttribute(item.identity, 'lastActivityAt');
    if (
      !lastActivityAt ||
      Number.isNaN(Date.parse(lastActivityAt)) ||
      Date.parse(lastActivityAt) >= cutoff.valueOf()
    ) {
      return [];
    }
    return [
      finding({
        type: 'STALE_ACCESS',
        severity: 'medium',
        title: 'Stale repository access requires review',
        ruleId: 'github.stale-access.v1',
        identity: item.identity,
        access: item,
        sourceFacts: accessFacts(item),
      }),
    ];
  });
}

function unownedRepositoryFindings(resources: readonly Resource[]): Finding[] {
  return resources.flatMap((resource) => {
    if (resource.resourceType !== 'repository' || stringAttribute(resource, 'businessOwner'))
      return [];
    return [
      finding({
        type: 'UNOWNED_REPOSITORY',
        severity: 'medium',
        title: 'Repository has no assigned business owner',
        ruleId: 'github.unowned-repository.v1',
        resource,
        sourceFacts: [resourceFact(resource)],
      }),
    ];
  });
}

function directGrantFindings(access: readonly AccessView[]): Finding[] {
  return access.flatMap((item) => {
    if (item.resource.resourceType !== 'repository' || item.grant.grantType !== 'DIRECT') return [];
    return [
      finding({
        type: 'DIRECT_GRANT_DRIFT',
        severity: 'low',
        title: 'Direct repository grant bypasses team access',
        ruleId: 'github.direct-grant-drift.v1',
        identity: item.identity,
        access: item,
        sourceFacts: accessFacts(item),
      }),
    ];
  });
}

function finding(input: {
  readonly type: GitHubFindingType;
  readonly severity: Severity;
  readonly title: string;
  readonly ruleId: string;
  readonly identity?: Identity;
  readonly resource?: Resource;
  readonly access?: AccessView;
  readonly sourceFacts: readonly FindingSourceFact[];
}): Finding {
  const resource = input.access?.resource ?? input.resource;
  const evidence = {
    ...(input.identity ? { identityId: input.identity.id } : {}),
    ...(resource ? { resourceId: resource.id } : {}),
    ...(input.access
      ? { entitlementId: input.access.entitlement.id, grantId: input.access.grant.id }
      : {}),
  };
  const subject = {
    ...(input.identity ? { identityId: input.identity.id } : {}),
    ...(resource ? { resourceId: resource.id } : {}),
    ...(input.access
      ? { entitlementId: input.access.entitlement.id, grantId: input.access.grant.id }
      : {}),
  };
  return {
    id: `${input.ruleId}:${subject.identityId ?? 'none'}:${subject.resourceId ?? 'none'}:${subject.grantId ?? 'none'}`,
    type: input.type,
    severity: input.severity,
    ruleId: input.ruleId,
    title: input.title,
    evidence,
    sourceFacts: input.sourceFacts,
    subject,
  };
}

function accessFacts(access: AccessView): readonly FindingSourceFact[] {
  return [
    identityFact(access.identity),
    resourceFact(access.resource),
    {
      kind: 'entitlement',
      id: access.entitlement.id,
      observedAt: access.entitlement.observedAt,
      label: access.entitlement.displayName,
    },
    {
      kind: 'grant',
      id: access.grant.id,
      observedAt: access.grant.observedAt,
      label: access.grant.grantType,
    },
  ];
}

function identityFact(identity: Identity): FindingSourceFact {
  return {
    kind: 'identity',
    id: identity.id,
    observedAt: identity.observedAt,
    label: identity.displayName,
  };
}

function resourceFact(resource: Resource): FindingSourceFact {
  return {
    kind: 'resource',
    id: resource.id,
    observedAt: resource.observedAt,
    label: resource.displayName,
  };
}

function stringAttribute(
  entity: { readonly attributes: Readonly<Record<string, JsonValue>> },
  key: string,
): string | undefined {
  const value = entity.attributes[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function booleanAttribute(
  entity: { readonly attributes: Readonly<Record<string, JsonValue>> },
  key: string,
): boolean | undefined {
  const value = entity.attributes[key];
  return typeof value === 'boolean' ? value : undefined;
}
