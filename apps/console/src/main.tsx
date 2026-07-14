import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './app-shell/AppShell.js';
import { ExportEvidenceButton } from './features/evidence/ExportEvidenceButton.js';
import { FindingPanel } from './features/findings/FindingPanel.js';
import { IdentityTable } from './features/inventory/IdentityTable.js';
import { DiscoveryQueue } from './features/discovery/DiscoveryQueue.js';
import { CatalogTable } from './features/catalog/CatalogTable.js';
import { CampaignList } from './features/reviews/CampaignList.js';
import { DecisionControls } from './features/reviews/DecisionControls.js';
import { PolicyQueue } from './features/reviews/PolicyQueue.js';
import { WorkflowLibrary } from './features/workflows/WorkflowLibrary.js';
import { ActionQueue } from './features/actions/ActionQueue.js';
import {
  aegisApi,
  type FindingDetail,
  type CatalogApplication,
  type DiscoveryQueueItem,
  type IdentitySummary,
  type ReviewCampaignSummary,
  type PolicyEvaluation,
  type WorkflowDefinition,
  type WorkflowExecution,
  type ControlledAction,
} from './lib/api.js';
import './styles.css';

const tenantId = 'acme-platform';
const selectedFindingId = 'PRV-2025-00073';

export function AegisConsole() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [identities, setIdentities] = useState<readonly IdentitySummary[]>([]);
  const [selectedIdentityId, setSelectedIdentityId] = useState('alice-example');
  const [finding, setFinding] = useState<FindingDetail>();
  const [campaigns, setCampaigns] = useState<readonly ReviewCampaignSummary[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [activeNavigation, setActiveNavigation] = useState('Inventory');
  const [catalog, setCatalog] = useState<readonly CatalogApplication[]>([]);
  const [discoveryQueue, setDiscoveryQueue] = useState<readonly DiscoveryQueueItem[]>([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(true);
  const [policyEvaluations, setPolicyEvaluations] = useState<readonly PolicyEvaluation[]>([]);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [workflowTemplates, setWorkflowTemplates] = useState<readonly WorkflowDefinition[]>([]);
  const [workflowLoading, setWorkflowLoading] = useState(true);
  const [workflowExecution, setWorkflowExecution] = useState<WorkflowExecution>();
  const [actions, setActions] = useState<readonly ControlledAction[]>([]);
  const [actionsLoading, setActionsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search), 200);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void aegisApi.listIdentities(tenantId, query).then((next) => {
      if (!active) return;
      setIdentities(next);
      setSelectedIdentityId((current) =>
        next.some((identity) => identity.id === current) ? current : (next[0]?.id ?? ''),
      );
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [query]);

  useEffect(() => {
    let active = true;
    void aegisApi.getFinding(tenantId, selectedFindingId).then((next) => {
      if (active) setFinding(selectedIdentityId === 'alice-example' ? next : undefined);
    });
    return () => {
      active = false;
    };
  }, [selectedIdentityId]);

  useEffect(() => {
    let active = true;
    void aegisApi.listReviewCampaigns(tenantId).then((next) => {
      if (!active) return;
      setCampaigns(next);
      setCampaignsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void aegisApi.listWorkflowTemplates().then((next) => {
      if (!active) return;
      setWorkflowTemplates(next);
      setWorkflowLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  async function runWorkflow(templateId: string) {
    const execution = await aegisApi.dryRunWorkflow(tenantId, {
      templateId,
      actor: 'Aegis Admin',
      sourceFacts: [
        {
          id: 'console:workflow-preview',
          kind: 'operator_input',
          label: 'Console preview request',
          observedAt: new Date().toISOString(),
        },
      ],
    });
    setWorkflowExecution(execution);
  }

  async function requestOffboardingActions(execution: WorkflowExecution) {
    const next = await aegisApi.requestOffboardingActions(tenantId, execution.id, {
      target: { subjectId: 'alice-example', displayName: 'Alice Example' },
      requestedBy: 'Aegis Admin',
    });
    setActions((current) => [
      ...next,
      ...current.filter((action) => !next.some((item) => item.id === action.id)),
    ]);
    setActiveNavigation('Actions');
  }

  useEffect(() => {
    let active = true;
    void aegisApi.listActions(tenantId).then((next) => {
      if (!active) return;
      setActions(next);
      setActionsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  async function updateAction(
    action: ControlledAction,
    operation: () => Promise<ControlledAction>,
  ) {
    const updated = await operation();
    setActions((current) => current.map((item) => (item.id === action.id ? updated : item)));
  }

  useEffect(() => {
    let active = true;
    void aegisApi.listReviewPolicies(tenantId).then((next) => {
      if (!active) return;
      setPolicyEvaluations(next);
      setPolicyLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  async function runPolicyReview(policyIds: readonly PolicyEvaluation['policyId'][]) {
    const campaign = await aegisApi.createPolicyReviewCampaign(tenantId, {
      title: 'Policy review',
      policyIds,
      fallbackReviewer: 'Aegis Admin',
      actor: 'Aegis Admin',
    });
    setCampaigns((current) => [campaign, ...current]);
  }

  async function assignCatalogOwners(
    applicationId: string,
    owners: readonly CatalogApplication['owners'][number][],
  ) {
    const updated = await aegisApi.assignCatalogOwners(tenantId, applicationId, owners);
    setCatalog((current) =>
      current.map((application) => (application.id === applicationId ? updated : application)),
    );
    const nextQueue = await aegisApi.listDiscoveryQueue(tenantId);
    setDiscoveryQueue(nextQueue);
  }

  useEffect(() => {
    let active = true;
    void Promise.all([aegisApi.listCatalog(tenantId), aegisApi.listDiscoveryQueue(tenantId)]).then(
      ([nextCatalog, nextQueue]) => {
        if (!active) return;
        setCatalog(nextCatalog);
        setDiscoveryQueue(nextQueue);
        setDiscoveryLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const selectedIdentity = useMemo(
    () => identities.find((identity) => identity.id === selectedIdentityId),
    [identities, selectedIdentityId],
  );
  const campaignTask = campaigns
    .flatMap((campaign) => campaign.tasks.map((task) => ({ campaign, task })))
    .find(({ task }) => task.findingId === finding?.id);

  return (
    <AppShell
      evidence={
        <>
          <FindingPanel finding={finding} />
          <DecisionControls
            disabled={!finding || !campaignTask}
            onSubmit={async (input) => {
              if (!campaignTask)
                throw new Error('No review campaign task is available for this finding.');
              await aegisApi.recordCampaignDecision(
                tenantId,
                campaignTask.campaign.id,
                campaignTask.task.id,
                {
                  decision:
                    input.decision === 'revocation_requested' ? 'remove_recommended' : 'retain',
                  reviewer: 'Aegis Admin',
                  rationale: input.comment || 'Reviewer decision recorded in the Aegis console.',
                },
              );
            }}
          />
          <CampaignList campaigns={campaigns} loading={campaignsLoading} />
          <ExportEvidenceButton
            api={aegisApi}
            campaignId={campaignTask?.campaign.id}
            tenantId={tenantId}
          />
        </>
      }
      evidenceOpen={evidenceOpen}
      navigationOpen={navigationOpen}
      onEvidenceToggle={() => setEvidenceOpen((open) => !open)}
      onNavigationToggle={() => setNavigationOpen((open) => !open)}
      onSearchChange={setSearch}
      search={search}
      activeNavigation={activeNavigation}
      onNavigate={setActiveNavigation}
    >
      {activeNavigation === 'Connectors' ? (
        <div className="inventory-page discovery-page">
          <div className="page-heading">
            <div>
              <p className="eyebrow">Discovery</p>
              <h1>Observation queue</h1>
              <p>Source-linked observations awaiting catalog and ownership review.</p>
            </div>
            <span className="identity-count">{discoveryQueue.length} observations</span>
          </div>
          <DiscoveryQueue items={discoveryQueue} loading={discoveryLoading} />
        </div>
      ) : activeNavigation === 'Resources' ? (
        <div className="inventory-page catalog-page">
          <div className="page-heading">
            <div>
              <p className="eyebrow">Catalog</p>
              <h1>Applications</h1>
              <p>Business context, risk posture, owners, and approved alternatives.</p>
            </div>
            <span className="identity-count">{catalog.length} applications</span>
          </div>
          <CatalogTable
            applications={catalog}
            loading={discoveryLoading}
            onAssignOwners={assignCatalogOwners}
          />
        </div>
      ) : activeNavigation === 'Reviews' ? (
        <div className="inventory-page discovery-page">
          <PolicyQueue
            evaluations={policyEvaluations}
            loading={policyLoading}
            onRunReview={runPolicyReview}
          />
        </div>
      ) : activeNavigation === 'Workflows' ? (
        <div className="inventory-page discovery-page">
          <WorkflowLibrary
            templates={workflowTemplates}
            execution={workflowExecution}
            loading={workflowLoading}
            onRun={runWorkflow}
            onRequestOffboarding={requestOffboardingActions}
          />
        </div>
      ) : activeNavigation === 'Actions' ? (
        <div className="inventory-page discovery-page">
          <ActionQueue
            actions={actions}
            loading={actionsLoading}
            onApprove={(action, breakGlass) =>
              updateAction(action, () =>
                aegisApi.approveAction(tenantId, action.id, {
                  approver: breakGlass ? 'Aegis Admin' : 'Security approver',
                  reason: breakGlass
                    ? 'Emergency response under time-bounded break-glass authority.'
                    : 'Source facts and rollback plan were reviewed.',
                  ...(breakGlass
                    ? {
                        breakGlass: {
                          reason: 'Urgent offboarding response.',
                          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                        },
                      }
                    : {}),
                }),
              )
            }
            onCompensate={(action) =>
              updateAction(action, () =>
                aegisApi.compensateAction(tenantId, action.id, 'Action executor'),
              )
            }
            onExecute={(action) =>
              updateAction(action, () =>
                aegisApi.executeAction(tenantId, action.id, 'Action executor'),
              )
            }
          />
        </div>
      ) : (
        <div className="inventory-page">
          <div className="page-heading">
            <div>
              <p className="eyebrow">Identity inventory</p>
              <h1>Identities</h1>
              <p>Observed access across connected systems. Aegis does not change source access.</p>
            </div>
            <span className="identity-count">{identities.length} people</span>
          </div>
          <div className="tabs" role="tablist" aria-label="Identity kinds">
            <button aria-selected="true" role="tab" type="button">
              People
            </button>
            <button aria-selected="false" role="tab" type="button">
              Service accounts
            </button>
            <button aria-selected="false" role="tab" type="button">
              Groups
            </button>
          </div>
          <div className="filters" aria-label="Identity filters">
            <span className="filter-search">⌕ Search people...</span>
            <button type="button">All sources⌄</button>
            <button type="button">All platforms⌄</button>
            <button type="button">Access: all⌄</button>
            <button type="button">⌘ Filters</button>
          </div>
          <IdentityTable
            identities={identities}
            loading={loading}
            onSelect={(identity) => setSelectedIdentityId(identity.id)}
            selectedIdentityId={selectedIdentity?.id}
          />
          <footer className="table-footer">
            <span>Showing {identities.length} identities</span>
            <span>
              Rows per page: 25　‹　<strong>1</strong>　›
            </span>
          </footer>
        </div>
      )}
    </AppShell>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<AegisConsole />);
