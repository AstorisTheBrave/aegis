export type CatalogRiskTier = 'low' | 'medium' | 'high' | 'critical';
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';
export type GovernanceRecommendation = 'allow' | 'monitor' | 'block_recommended';
export type OwnerRole = 'business' | 'technical';

export interface CatalogOwner {
  readonly identityId: string;
  readonly role: OwnerRole;
  readonly assignedAt: string;
}

export interface CatalogApplication {
  readonly tenantId: string;
  readonly id: string;
  readonly vendorName: string;
  readonly normalizedName: string;
  readonly domains: readonly string[];
  readonly aliases: readonly string[];
  readonly category: string;
  readonly riskTier: CatalogRiskTier;
  readonly dataClassification: DataClassification;
  readonly recommendation: GovernanceRecommendation;
  readonly owners: readonly CatalogOwner[];
  readonly approvedAlternatives: readonly string[];
  readonly renewalAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SaasCatalogRepository {
  upsert(application: CatalogApplication): Promise<CatalogApplication>;
  get(tenantId: string, id: string): Promise<CatalogApplication | undefined>;
  list(tenantId: string): Promise<readonly CatalogApplication[]>;
  assignOwners(
    tenantId: string,
    id: string,
    owners: readonly CatalogOwner[],
    updatedAt: string,
  ): Promise<CatalogApplication | undefined>;
}

export function normalizeCatalogValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '');
}

export function validateCatalogApplication(application: CatalogApplication): void {
  if (!application.tenantId || !application.id || !application.vendorName) {
    throw new Error('Catalog applications require tenantId, id, and vendorName');
  }
  if (!application.domains.length && !application.aliases.length) {
    throw new Error('Catalog applications require at least one domain or alias');
  }
  if (application.domains.some((domain) => !normalizeCatalogValue(domain))) {
    throw new Error('Catalog application domains must be non-empty');
  }
  const ownerKeys = application.owners.map((owner) => `${owner.role}:${owner.identityId}`);
  if (new Set(ownerKeys).size !== ownerKeys.length) {
    throw new Error('Catalog application owners must be unique by role and identity');
  }
}

export class InMemorySaasCatalogRepository implements SaasCatalogRepository {
  readonly #applications = new Map<string, CatalogApplication>();

  async upsert(application: CatalogApplication): Promise<CatalogApplication> {
    validateCatalogApplication(application);
    const normalized: CatalogApplication = {
      ...application,
      normalizedName: normalizeCatalogValue(application.normalizedName || application.vendorName),
      domains: [...new Set(application.domains.map(normalizeCatalogValue))].sort(),
      aliases: [...new Set(application.aliases.map(normalizeCatalogValue))].sort(),
      owners: [...application.owners].sort((left, right) =>
        `${left.role}:${left.identityId}`.localeCompare(`${right.role}:${right.identityId}`),
      ),
      approvedAlternatives: [...new Set(application.approvedAlternatives)].sort(),
    };
    this.#applications.set(`${normalized.tenantId}:${normalized.id}`, normalized);
    return normalized;
  }

  async get(tenantId: string, id: string): Promise<CatalogApplication | undefined> {
    return this.#applications.get(`${tenantId}:${id}`);
  }

  async list(tenantId: string): Promise<readonly CatalogApplication[]> {
    return [...this.#applications.values()]
      .filter((application) => application.tenantId === tenantId)
      .sort(
        (left, right) =>
          left.vendorName.localeCompare(right.vendorName) || left.id.localeCompare(right.id),
      );
  }

  async assignOwners(
    tenantId: string,
    id: string,
    owners: readonly CatalogOwner[],
    updatedAt: string,
  ): Promise<CatalogApplication | undefined> {
    const application = await this.get(tenantId, id);
    if (!application) return undefined;
    return this.upsert({ ...application, owners, updatedAt });
  }
}
