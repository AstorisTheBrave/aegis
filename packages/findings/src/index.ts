import type { AccessView } from '@open-saas-governance/access-graph';
export type Severity = 'low' | 'medium' | 'high';
export interface Finding {
  readonly id: string;
  readonly severity: Severity;
  readonly ruleId: string;
  readonly title: string;
  readonly evidence: Readonly<Record<string, string>>;
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
      severity: 'high',
      ruleId: this.id,
      title: 'Privileged access requires review',
      evidence: {
        identityId: access.identity.id,
        grantId: access.grant.id,
        entitlementId: access.entitlement.id,
        resourceId: access.resource.id,
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
