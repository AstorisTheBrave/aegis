import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './app-shell/AppShell.js';
import { ExportEvidenceButton } from './features/evidence/ExportEvidenceButton.js';
import { FindingPanel } from './features/findings/FindingPanel.js';
import { IdentityTable } from './features/inventory/IdentityTable.js';
import { CampaignList } from './features/reviews/CampaignList.js';
import { DecisionControls } from './features/reviews/DecisionControls.js';
import {
  aegisApi,
  type FindingDetail,
  type IdentitySummary,
  type ReviewCampaignSummary,
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
    >
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
    </AppShell>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<AegisConsole />);
