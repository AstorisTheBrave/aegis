import type { ReviewCampaignSummary } from '../../lib/api.js';

export function CampaignList({
  campaigns,
  loading,
}: {
  readonly campaigns: readonly ReviewCampaignSummary[];
  readonly loading: boolean;
}) {
  return (
    <section className="campaign-list" aria-labelledby="campaigns-heading">
      <div className="campaign-list-heading">
        <h3 id="campaigns-heading">Review campaigns</h3>
        <span>{campaigns.length}</span>
      </div>
      {loading ? <p>Loading review routes…</p> : null}
      {!loading && campaigns.length === 0 ? <p>No active campaigns.</p> : null}
      {!loading ? (
        <ul>
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <strong>{campaign.title}</strong>
              <span>
                {campaign.tasks.length} task{campaign.tasks.length === 1 ? '' : 's'} ·{' '}
                {campaign.status}
              </span>
              <small>
                {campaign.dueAt
                  ? `Due ${new Date(campaign.dueAt).toLocaleDateString()}`
                  : 'No due date'}
              </small>
              {campaign.tasks.map((task) => (
                <small key={task.id}>
                  {task.assignedReviewer ?? 'Awaiting reviewer assignment'} ·{' '}
                  {task.route.replace('_', ' ')} ·{' '}
                  {task.decisions.length
                    ? `${task.decisions.at(-1)?.kind.replace('_', ' ')} by ${task.decisions.at(-1)?.reviewer}`
                    : 'No decision yet'}
                </small>
              ))}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
