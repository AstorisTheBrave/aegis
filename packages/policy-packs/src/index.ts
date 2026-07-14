import type { PolicyPackContribution } from '@aegis/extension-registry';

export interface CommunityPolicyPack {
  readonly id: string;
  readonly version: string;
  readonly title: string;
  readonly description: string;
  readonly contribution: PolicyPackContribution;
}

export const communityPolicyPacks: readonly CommunityPolicyPack[] = [
  pack(
    'soc2-access-governance',
    'SOC 2 access governance',
    'Evidence-oriented access review, least-privilege, and owner-accountability controls.',
    ['SOC 2 CC6.1', 'SOC 2 CC6.2', 'SOC 2 CC6.3'],
    [
      rule('soc2.privileged-access-review.v1', 'Review privileged access', 'high', [
        'identity',
        'grant',
      ]),
      rule('soc2.owner-accountability.v1', 'Assign a resource owner', 'medium', ['resource']),
    ],
  ),
  pack(
    'iso27001-access-control',
    'ISO 27001 access control',
    'Deterministic controls for access review, least privilege, and account lifecycle evidence.',
    ['ISO 27001:2022 A.5.15', 'ISO 27001:2022 A.5.18'],
    [
      rule('iso27001.access-review.v1', 'Review access periodically', 'medium', [
        'identity',
        'grant',
      ]),
      rule('iso27001.dormant-access.v1', 'Investigate dormant access', 'medium', [
        'identity',
        'usage',
      ]),
    ],
  ),
  pack(
    'least-privilege',
    'Least privilege baseline',
    'Flags broad, direct, and elevated grants with source-linked evidence.',
    ['Least privilege'],
    [
      rule('least-privilege.direct-grant.v1', 'Review direct grants', 'low', [
        'grant',
        'entitlement',
      ]),
      rule('least-privilege.elevated-grant.v1', 'Review elevated grants', 'high', [
        'grant',
        'entitlement',
      ]),
    ],
  ),
  pack(
    'contractor-governance',
    'Contractor governance',
    'Focuses review attention on contractor identity state, expiry, and elevated access.',
    ['Contractor governance'],
    [
      rule('contractor.expired-account.v1', 'Review expired contractor accounts', 'high', [
        'identity',
      ]),
      rule('contractor.elevated-access.v1', 'Review contractor elevated access', 'high', [
        'identity',
        'grant',
      ]),
    ],
  ),
  pack(
    'saas-owner-accountability',
    'SaaS owner accountability',
    'Ensures every governed resource has accountable business ownership.',
    ['SaaS ownership'],
    [
      rule('saas-owner.unowned-resource.v1', 'Assign an owner to each resource', 'medium', [
        'resource',
      ]),
      rule('saas-owner.owner-review.v1', 'Route review to resource owner', 'medium', [
        'resource',
        'grant',
      ]),
    ],
  ),
];

function pack(
  id: string,
  title: string,
  description: string,
  controls: readonly string[],
  rules: PolicyPackContribution['rules'],
): CommunityPolicyPack {
  return { id, version: '1.0.0', title, description, contribution: { controls, rules } };
}

function rule(
  id: string,
  title: string,
  severity: 'low' | 'medium' | 'high',
  requiredSourceFacts: readonly string[],
): PolicyPackContribution['rules'][number] {
  return { id, title, severity, requiredSourceFacts };
}
