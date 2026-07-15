import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AppShell } from './app-shell/AppShell.js';
import type { NavigationLabel } from './app-shell/navigation.js';
import { ConsoleLoadNotice } from './components/ConsoleLoadNotice.js';
import { ExportEvidenceButton } from './features/evidence/ExportEvidenceButton.js';
import { FindingList } from './features/findings/FindingList.js';
import { FindingPanel } from './features/findings/FindingPanel.js';
import { IdentityTable } from './features/inventory/IdentityTable.js';
import { IdentityFilters } from './features/inventory/IdentityFilters.js';
import { DiscoveryQueue } from './features/discovery/DiscoveryQueue.js';
import { CatalogTable } from './features/catalog/CatalogTable.js';
import { CampaignList } from './features/reviews/CampaignList.js';
import { DecisionControls } from './features/reviews/DecisionControls.js';
import { PolicyQueue } from './features/reviews/PolicyQueue.js';
import { WorkflowLibrary } from './features/workflows/WorkflowLibrary.js';
import { ActionQueue } from './features/actions/ActionQueue.js';
import { AccessRequestQueue } from './features/requests/AccessRequestQueue.js';
import { AssistancePanel } from './features/assistance/AssistancePanel.js';
import { WorkspacePlaceholder } from './features/workspace/WorkspacePlaceholder.js';
import { type AccessFilter, useConsoleLocation } from './hooks/useConsoleLocation.js';
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected request error occurred.';
}

function matchesIdentityFilters(
  identity: IdentitySummary,
  source: string,
  platform: string,
  access: AccessFilter,
): boolean {
  if (source && identity.source !== source) return false;
  if (platform && identity.platform !== platform) return false;
  if (access === 'privileged' && !identity.privileged) return false;
  if (access === 'requires_review' && identity.status !== 'requires_review') return false;
  return true;
}

export function AegisConsole() {
  const [location, setLocation] = useConsoleLocation();
  const [query, setQuery] = useState(() => location.query);
  const [identities, setIdentities] = useState<readonly IdentitySummary[]>([]);
  const [finding, setFinding] = useState<FindingDetail>();
  const [findings, setFindings] = useState<readonly FindingListItem[]>([]);
  const [selectedFindingId, setSelectedFindingId] = useState<string>();
  const [campaigns, setCampaigns] = useState<readonly ReviewCampaignSummary[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
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
  const [loadError, setLoadError] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);

  const activeNavigation = location.navigation;
  const search = location.query;

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search), 200);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void aegisApi
      .listIdentities(tenantId, query)
      .then((next) => {
        if (!active) return;
        setIdentities(next);
        setLocation((current) => ({
          ...current,
          identityId: next.some((identity) => identity.id === current.identityId)
            ? current.identityId
            : (next[0]?.id ?? ''),
        }));
      })
      .catch((error: unknown) => {
        if (active) setLoadError((current) => current ?? errorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query, reloadKey, setLocation]);

  useEffect(() => {
    let active = true;
    void aegisApi
      .listFindings(tenantId)
      .then((next) => {
        if (!active) return;
        setFindings(next);
      })
      .catch((error: unknown) => {
        if (active) setLoadError((current) => current ?? errorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    let active = true;
    setAccessRequestsLoading(true);
    void aegisApi
      .listAccessRequests(tenantId)
      .then((next) => {
        if (!active) return;
        setAccessRequests(next);
      })
      .catch((error: unknown) => {
        if (active) setLoadError((current) => current ?? errorMessage(error));
      })
      .finally(() => {
        if (active) setAccessRequestsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    let active = true;
    setAssistanceLoading(true);
    void aegisApi
      .getAssistanceSettings(tenantId)
      .then((next) => {
        if (!active) return;
        setAssistanceSettings(next);
      })
      .catch((error: unknown) => {
        if (active) setLoadError((current) => current ?? errorMessage(error));
      })
      .finally(() => {
        if (active) setAssistanceLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

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
    void aegisApi
      .listTestActivations(tenantId)
      .then((next) => {
        if (active) setTestActivations(next);
      })
      .catch((error: unknown) => {
        if (active) setLoadError((current) => current ?? errorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!selectedFindingId) {
      setFinding(undefined);
      return;
    }
    let active = true;
    void aegisApi
      .getFinding(tenantId, selectedFindingId)
      .then((next) => {
        if (active) setFinding(next);
      })
      .catch((error: unknown) => {
        if (active) setLoadError((current) => current ?? errorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [selectedFindingId]);

  useEffect(() => {
    let active = true;
    setCampaignsLoading(true);
    void aegisApi
      .listReviewCampaigns(tenantId)
      .then((next) => {
        if (!active) return;
        setCampaigns(next);
      })
      .catch((error: unknown) => {
        if (active) setLoadError((current) => current ?? errorMessage(error));
      })
      .finally(() => {
        if (active) setCampaignsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    let active = true;
    setWorkflowLoading(true);
    void aegisApi
      .listWorkflowTemplates()
      .then((next) => {
        if (!active) return;
        setWorkflowTemplates(next);
      })
      .catch((error: unknown) => {
        if (active) setLoadError((current) => current ?? errorMessage(error));
      })
      .finally(() => {
        if (active) setWorkflowLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

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
    setLocation((current) => ({ ...current, navigation: 'Actions' }));
  }

  useEffect(() => {
    let active = true;
    setActionsLoading(true);
    void aegisApi
      .listActions(tenantId)
      .then((next) => {
        if (!active) return;
        setActions(next);
      })
      .catch((error: unknown) => {
        if (active) setLoadError((current) => current ?? errorMessage(error));
      })
      .finally(() => {
        if (active) setActionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  async function updateAction(
    action: ControlledAction,
    operation: () => Promise<ControlledAction>,
  ) {
    const updated = await operation();
    setActions((current) => current.map((item) => (item.id === action.id ? updated : item)));
  }

  useEffect(() => {
    let active = true;
    setPolicyLoading(true);
    void aegisApi
      .listReviewPolicies(tenantId)
      .then((next) => {
        if (!active) return;
        setPolicyEvaluations(next);
      })
      .catch((error: unknown) => {
        if (active) setLoadError((current) => current ?? errorMessage(error));
      })
      .finally(() => {
        if (active) setPolicyLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

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
    setDiscoveryLoading(true);
    void Promise.all([aegisApi.listCatalog(tenantId), aegisApi.listDiscoveryQueue(tenantId)])
      .then(([nextCatalog, nextQueue]) => {
        if (!active) return;
        setCatalog(nextCatalog);
        setDiscoveryQueue(nextQueue);
      })
      .catch((error: unknown) => {
        if (active) setLoadError((current) => current ?? errorMessage(error));
      })
      .finally(() => {
        if (active) setDiscoveryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const filteredIdentities = useMemo(
    () =>
      identities.filter((identity) =>
        matchesIdentityFilters(identity, location.source, location.platform, location.access),
      ),
    [identities, location.access, location.platform, location.source],
  );
  const sources = useMemo(
    () => Array.from(new Set(identities.map((identity) => identity.source))).sort(),
    [identities],
  );
  const platforms = useMemo(
    () => Array.from(new Set(identities.map((identity) => identity.platform))).sort(),
    [identities],
  );
  const selectedIdentity = useMemo(
    () => filteredIdentities.find((identity) => identity.id === location.identityId),
    [filteredIdentities, location.identityId],
  );

  useEffect(() => {
    if (!filteredIdentities.length || selectedIdentity) return;
    setLocation((current) => ({ ...current, identityId: filteredIdentities[0]?.id ?? '' }));
  }, [filteredIdentities, selectedIdentity, setLocation]);

  useEffect(() => {
    setSelectedFindingId(
      findings.find(
        (item) => item.status === 'open' && item.identity === selectedIdentity?.displayName,
      )?.id,
    );
  }, [findings, selectedIdentity]);
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
      onSearchChange={(value) =>
        setLocation((current) => ({ ...current, navigation: 'Inventory', query: value }))
      }
      search={search}
      activeNavigation={activeNavigation}
      onNavigate={(navigation: NavigationLabel) =>
        setLocation((current) => ({ ...current, navigation }))
      }
    >
      <ConsoleLoadNotice
        message={loadError}
        onRetry={() => {
          setLoadError(undefined);
          setReloadKey((current) => current + 1);
        }}
      />
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
      ) : activeNavigation === 'Policies' ? (
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
      ) : activeNavigation === 'Findings' ? (
        <div className="inventory-page discovery-page">
          <div className="page-heading">
            <div>
              <p className="eyebrow">Review workspace</p>
              <h1>Findings</h1>
              <p>Open access observations that need an accountable decision.</p>
            </div>
            <span className="identity-count">{findings.length} open</span>
          </div>
          <FindingList
            findings={findings}
            onSelect={(item) => {
              setSelectedFindingId(item.id);
              setLocation((current) => ({ ...current, navigation: 'Findings' }));
            }}
            selectedFindingId={selectedFindingId}
          />
        </div>
      ) : activeNavigation === 'Controls' ? (
        <WorkspacePlaceholder
          description="Operational controls will collect the console-wide safeguards that govern automation, evidence retention, and notification delivery."
          eyebrow="Control plane"
          nextStep="Connect a control-plane provider to configure these safeguards."
          title="Controls"
        />
      ) : activeNavigation === 'Settings' ? (
        <WorkspacePlaceholder
          description="Workspace settings will keep tenant preferences and administrator configuration separate from governed access decisions."
          eyebrow="Workspace"
          nextStep="Connect an organisation settings provider to manage workspace configuration."
          title="Settings"
        />
      ) : (
        <div className="inventory-page">
          <div className="page-heading">
            <div>
              <p className="eyebrow">Identity inventory</p>
              <h1>Identities</h1>
              <p>Observed access across connected systems. Aegis does not change source access.</p>
            </div>
            <span className="identity-count">{filteredIdentities.length} people</span>
          </div>
          <div className="tabs" role="tablist" aria-label="Identity kinds">
            <button aria-selected="true" role="tab" type="button">
              People
            </button>
            <button
              aria-selected="false"
              disabled
              role="tab"
              title="No service-account data is connected yet"
              type="button"
            >
              Service accounts
            </button>
            <button
              aria-selected="false"
              disabled
              role="tab"
              title="No group data is connected yet"
              type="button"
            >
              Groups
            </button>
          </div>
          <IdentityFilters
            access={location.access}
            onAccessChange={(access) => setLocation((current) => ({ ...current, access }))}
            onClear={() =>
              setLocation((current) => ({
                ...current,
                access: 'all',
                platform: '',
                query: '',
                source: '',
              }))
            }
            onPlatformChange={(platform) => setLocation((current) => ({ ...current, platform }))}
            onSearchChange={(nextSearch) =>
              setLocation((current) => ({ ...current, query: nextSearch }))
            }
            onSourceChange={(source) => setLocation((current) => ({ ...current, source }))}
            platform={location.platform}
            platforms={platforms}
            search={search}
            source={location.source}
            sources={sources}
          />
          <IdentityTable
            identities={filteredIdentities}
            loading={loading}
            onSelect={(identity) =>
              setLocation((current) => ({ ...current, identityId: identity.id }))
            }
            selectedIdentityId={selectedIdentity?.id}
          />
          <footer className="table-footer">
            <span>Showing {filteredIdentities.length} identities</span>
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
