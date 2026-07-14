import {
  reconcileDiscovery,
  reconcileDiscoveryAgainstApplications,
  validateDiscoveryObservation,
  type DiscoveryObservation,
  type DiscoveryQueueItem,
  type DiscoveryRepository,
} from '@aegis/discovery';
import {
  validateCatalogApplication,
  type CatalogApplication,
  type CatalogOwner,
  type SaasCatalogRepository,
} from '@aegis/saas-catalog';

export interface DiscoveryManager {
  listCatalog(tenantId: string): Promise<readonly CatalogApplication[]>;
  createCatalog(application: CatalogApplication): Promise<CatalogApplication>;
  assignOwners(
    tenantId: string,
    applicationId: string,
    owners: readonly CatalogOwner[],
    updatedAt: string,
  ): Promise<CatalogApplication | undefined>;
  listQueue(tenantId: string): Promise<readonly DiscoveryQueueItem[]>;
  observe(observation: DiscoveryObservation): Promise<DiscoveryQueueItem>;
}

export class CatalogDiscoveryManager implements DiscoveryManager {
  constructor(
    private readonly catalog: SaasCatalogRepository,
    private readonly observations: DiscoveryRepository,
  ) {}

  async listCatalog(tenantId: string): Promise<readonly CatalogApplication[]> {
    return this.catalog.list(tenantId);
  }

  async createCatalog(application: CatalogApplication): Promise<CatalogApplication> {
    validateCatalogApplication(application);
    return this.catalog.upsert(application);
  }

  async assignOwners(
    tenantId: string,
    applicationId: string,
    owners: readonly CatalogOwner[],
    updatedAt: string,
  ): Promise<CatalogApplication | undefined> {
    return this.catalog.assignOwners(tenantId, applicationId, owners, updatedAt);
  }

  async listQueue(tenantId: string): Promise<readonly DiscoveryQueueItem[]> {
    const applications = await this.catalog.list(tenantId);
    return Promise.all(
      (await this.observations.list(tenantId)).map((observation) =>
        reconcileDiscoveryAgainstApplications(observation, applications),
      ),
    );
  }

  async observe(observation: DiscoveryObservation): Promise<DiscoveryQueueItem> {
    validateDiscoveryObservation(observation);
    const recorded = await this.observations.record(observation);
    return reconcileDiscovery(recorded, this.catalog);
  }
}
