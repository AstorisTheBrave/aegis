import {
  normalizeCatalogValue,
  type CatalogApplication,
  type GovernanceRecommendation,
  type SaasCatalogRepository,
} from '@aegis/saas-catalog';

export type DiscoverySource =
  | 'idp'
  | 'finance'
  | 'sso_log'
  | 'browser_extension'
  | 'endpoint_inventory'
  | 'email_domain'
  | 'api_token_inventory';
export type IdentityType =
  'human' | 'service_account' | 'bot' | 'oauth_application' | 'api_key' | 'integration';
export type DiscoveryReason =
  'unknown_app' | 'missing_owner' | 'high_risk' | 'unused_license' | 'non_human_access';

export interface DiscoveryObservation {
  readonly tenantId: string;
  readonly id: string;
  readonly source: DiscoverySource;
  readonly sourceReference: string;
  readonly vendorName: string;
  readonly domain?: string;
  readonly observedAt: string;
  readonly activityCount: number;
  readonly identityType?: IdentityType;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface UsageSignal {
  readonly tenantId: string;
  readonly appId?: string;
  readonly observationId: string;
  readonly observedAt: string;
  readonly activityCount: number;
  readonly source: DiscoverySource;
}

export interface DiscoveryQueueItem {
  readonly observation: DiscoveryObservation;
  readonly application?: CatalogApplication;
  readonly reasons: readonly DiscoveryReason[];
  readonly recommendation: GovernanceRecommendation;
  readonly usage: UsageSignal;
}

export interface DiscoveryRepository {
  record(observation: DiscoveryObservation): Promise<DiscoveryObservation>;
  list(tenantId: string): Promise<readonly DiscoveryObservation[]>;
}

const secretLikeKey = /(credential|secret|token|password|private.?key)/i;

export function validateDiscoveryObservation(observation: DiscoveryObservation): void {
  if (
    !observation.tenantId ||
    !observation.id ||
    !observation.sourceReference ||
    !observation.vendorName
  ) {
    throw new Error('Discovery observations require tenantId, id, sourceReference, and vendorName');
  }
  if (observation.activityCount < 0 || !Number.isInteger(observation.activityCount)) {
    throw new Error('Discovery observation activityCount must be a non-negative integer');
  }
  if (Object.keys(observation.metadata ?? {}).some((key) => secretLikeKey.test(key))) {
    throw new Error('Discovery observation metadata must not contain credential-shaped fields');
  }
}

export class InMemoryDiscoveryRepository implements DiscoveryRepository {
  readonly #observations = new Map<string, DiscoveryObservation>();

  async record(observation: DiscoveryObservation): Promise<DiscoveryObservation> {
    validateDiscoveryObservation(observation);
    this.#observations.set(
      `${observation.tenantId}:${observation.source}:${observation.id}`,
      observation,
    );
    return observation;
  }

  async list(tenantId: string): Promise<readonly DiscoveryObservation[]> {
    return [...this.#observations.values()]
      .filter((observation) => observation.tenantId === tenantId)
      .sort(
        (left, right) =>
          right.observedAt.localeCompare(left.observedAt) || left.id.localeCompare(right.id),
      );
  }
}

function matchApplication(
  observation: DiscoveryObservation,
  applications: readonly CatalogApplication[],
): CatalogApplication | undefined {
  const domain = observation.domain ? normalizeCatalogValue(observation.domain) : undefined;
  if (domain) {
    const byDomain = applications.find((application) => application.domains.includes(domain));
    if (byDomain) return byDomain;
  }
  const name = normalizeCatalogValue(observation.vendorName);
  return applications.find(
    (application) => application.normalizedName === name || application.aliases.includes(name),
  );
}

export function reconcileDiscoveryAgainstApplications(
  observation: DiscoveryObservation,
  applications: readonly CatalogApplication[],
): DiscoveryQueueItem {
  const application = matchApplication(observation, applications);
  const reasons: DiscoveryReason[] = [];
  if (!application) reasons.push('unknown_app');
  if (application && application.owners.length === 0) reasons.push('missing_owner');
  if (application && (application.riskTier === 'high' || application.riskTier === 'critical'))
    reasons.push('high_risk');
  if (observation.activityCount === 0) reasons.push('unused_license');
  if (observation.identityType && observation.identityType !== 'human')
    reasons.push('non_human_access');
  return {
    observation,
    application,
    reasons,
    recommendation: application?.recommendation ?? 'monitor',
    usage: {
      tenantId: observation.tenantId,
      appId: application?.id,
      observationId: observation.id,
      observedAt: observation.observedAt,
      activityCount: observation.activityCount,
      source: observation.source,
    },
  };
}

export async function reconcileDiscovery(
  observation: DiscoveryObservation,
  catalog: SaasCatalogRepository,
): Promise<DiscoveryQueueItem> {
  return reconcileDiscoveryAgainstApplications(
    observation,
    await catalog.list(observation.tenantId),
  );
}
