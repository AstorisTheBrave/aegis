import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChevronDown, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react';
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
import { AccessRequestQueue } from './features/requests/AccessRequestQueue.js';
import { AssistancePanel } from './features/assistance/AssistancePanel.js';
import {
  aegisApi,
  type FindingDetail,
  type FindingListItem,
  type CatalogApplication,
  type DiscoveryQueueItem,
  type IdentitySummary,
  type ReviewCampaignSummary,
  type PolicyEvaluation,
  type WorkflowDefinition,
  type WorkflowExecution,
  type ControlledAction,
  type TestTenantActivationSummary,
  type AccessRequest,
  type AssistanceOutput,
  type AssistanceSettings,
} from './lib/api.js';
import './styles.css';

const tenantId = 'acme-platform';
export function AegisConsole() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [identities, setIdentities] = useState<readonly IdentitySummary[]>([]);
  const [selectedIdentityId, setSelectedIdentityId] = useState('alice-example');
  const [finding, setFinding] = useState<FindingDetail>();
  const [findings, setFindings] = useState<readonly FindingListItem[]>([]);
  const [selectedFindingId, setSelectedFindingId] = useState<string>();
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
  const [testActivations, setTestActivations] = useState<readonly TestTenantActivationSummary[]>(
    [],
  );
  const [accessRequests, setAccessRequests] = useState<readonly AccessRequest[]>([]);
  const [accessRequestsLoading, setAccessRequestsLoading] = useState(true);
  const [assistanceSettings, setAssistanceSettings] = useState<AssistanceSettings>();
  const [assistanceOutput, setAssistanceOutput] = useState<AssistanceOutput>();
  const [assistanceLoading, setAssistanceLoading] = useState(true);

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
    void aegisApi.listFindings(tenantId).then((next) => {
      if (!active) return;
      setFindings(next);
      setSelectedFindingId(next[0]?.id);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void aegisApi.listAccessRequests(tenantId).then((next) => {
      if (!active) return;
      setAccessRequests(next);
      setAccessRequestsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void aegisApi.getAssistanceSettings(tenantId).then((next) => {
      if (!active) return;
      setAssistanceSettings(next);
      setAssistanceLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  async function enableAssistance() {
    const settings = await aegisApi.updateAssistanceSettings(tenantId, {
      enabled: true,
      allowedProviders: ['aegis-deterministic-local.v1'],
      budgetPerRequest: 400,
      actor: 'Aegis Admin',
    });
    setAssistanceSettings(settings);
  }

  async function generateAssistance() {
    const output = await aegisApi.generateAssistance(tenantId, {
      kind: 'evidence_summary',
      providerId: 'aegis-deterministic-local.v1',
      actor: 'Aegis Admin',
      promptVersion: 'console-evidence-summary.v1',
      sourceFacts: [
        {
          id: 'console:access-inventory',
          label: 'Current access inventory',
          observedAt: new Date().toISOString(),
        },
      ],
    });
    setAssistanceOutput(output);
  }

  async function requestGithubAccess() {
    const created = await aegisApi.createAccessRequest(tenantId, {
      catalogItemId: 'github-maintain',
      requester: 'Aegis Admin',
      rationale: 'Time-bound investigation requested from the access console.',
      durationMinutes: 60,
      idempotencyKey: `console:github-maintain:${crypto.randomUUID()}`,
    });
    setAccessRequests((current) => [created, ...current]);
  }

  async function updateAccessRequest(operation: () => Promise<AccessRequest>) {
    const updated = await operation();
    setAccessRequests((current) =>
      current.map((request) => (request.id === updated.id ? updated : request)),
    );
  }

  useEffect(() => {
    let active = true;
    void aegisApi.listTestActivations(tenantId).then((next) => {
      if (active) setTestActivations(next);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedFindingId) {
      setFinding(undefined);
      return;
    }
    let active = true;
    void aegisApi.getFinding(tenantId, selectedFindingId).then((next) => {
      if (active) setFinding(next);
    });
    return () => {
      active = false;
    };
  }, [selectedFindingId]);

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
  const activeTestActivationCount = testActivations.filter(
    (activation) => new Date(activation.expiresAt) > new Date(),
  ).length;

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
          <section className="test-activation-status" aria-label="Test tenant activation status">
            <div>
              <p className="eyebrow">Provider execution boundary</p>
              <h2>Test-tenant activations</h2>
              <p>
                Controlled actions require an unexpired test activation. Production providers and
                credentials are not available here.
              </p>
            </div>
            <span className="identity-count">
              {activeTestActivationCount} active test configuration
              {activeTestActivationCount === 1 ? '' : 's'}
            </span>
          </section>
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
      ) : activeNavigation === 'Access' ? (
        <div className="inventory-page discovery-page">
          <AccessRequestQueue
            loading={accessRequestsLoading}
            onActivate={(request) =>
              updateAccessRequest(() => aegisApi.activateAccessRequest(tenantId, request.id))
            }
            onDecide={(request, approved) =>
              updateAccessRequest(() =>
                aegisApi.decideAccessRequest(tenantId, request.id, {
                  reviewer: 'resource-owner@acme.dev',
                  approved,
                  reason: approved
                    ? 'Time-bounded access is appropriate for the recorded purpose.'
                    : 'The recorded purpose does not justify elevated access.',
                }),
              )
            }
            onRequest={requestGithubAccess}
            requests={accessRequests}
          />
        </div>
      ) : activeNavigation === 'Assistant' ? (
        <div className="inventory-page discovery-page">
          <AssistancePanel
            loading={assistanceLoading}
            onEnable={enableAssistance}
            onGenerate={generateAssistance}
            output={assistanceOutput}
            settings={assistanceSettings}
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
            <span className="filter-search">
              <Search aria-hidden="true" size={13} strokeWidth={1.8} />
              Search people...
            </span>
            <button type="button">
              All sources <ChevronDown aria-hidden="true" size={13} strokeWidth={1.8} />
            </button>
            <button type="button">
              All platforms <ChevronDown aria-hidden="true" size={13} strokeWidth={1.8} />
            </button>
            <button type="button">
              Access: all <ChevronDown aria-hidden="true" size={13} strokeWidth={1.8} />
            </button>
            <button type="button">
              <SlidersHorizontal aria-hidden="true" size={13} strokeWidth={1.8} />
              Filters
            </button>
          </div>
          <IdentityTable
            identities={identities}
            loading={loading}
            onSelect={(identity) => {
              setSelectedIdentityId(identity.id);
              setSelectedFindingId(
                findings.find(
                  (item) => item.status === 'open' && item.identity === identity.displayName,
                )?.id,
              );
            }}
            selectedIdentityId={selectedIdentity?.id}
          />
          <footer className="table-footer">
            <span>Showing {identities.length} identities</span>
            <span>
              Rows per page: 25
              <ChevronLeft aria-hidden="true" size={13} strokeWidth={1.8} />
              <strong>1</strong>
              <ChevronRight aria-hidden="true" size={13} strokeWidth={1.8} />
            </span>
          </footer>
        </div>
      )}
    </AppShell>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<AegisConsole />);
