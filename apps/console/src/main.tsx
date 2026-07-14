import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
const people = [
  'Alice Example',
  'Bob Weaver',
  'Carol Lee',
  'David Grant',
  'Emma Rogers',
  'Frank Wright',
  'Grace Ruiz',
  'Hank Roberts',
];
function App() {
  const [decision, setDecision] = useState('Maintain');
  return (
    <main>
      <aside>
        <div className="brand">
          ◈ <b>Aegis</b>
          <small>self-hosted</small>
        </div>
        <div className="env">
          acme/platform
          <br />
          <small>Environment</small>
        </div>
        {[
          'Inventory',
          'Findings',
          'Reviews',
          'Access',
          'Identities',
          'Resources',
          'Policies',
          'Controls',
          'Connectors',
          'Settings',
        ].map((x, i) => (
          <div className={i === 0 ? 'nav active' : 'nav'} key={x}>
            {x}
          </div>
        ))}
        <footer>AE&nbsp; Aegis Admin</footer>
      </aside>
      <section>
        <header>
          ☰　 Inventory　›　Identities{' '}
          <input placeholder="Search identities, resources, roles..." />
          　◯　?
        </header>
        <div className="content">
          <h1>Identities</h1>
          <div className="tabs">People　 Service Accounts　 Groups</div>
          <div className="filters">
            ⌕　Search people...　　All Sources⌄　　All Platforms⌄　　Access: All⌄　　⚱ Filters
          </div>
          <table>
            <thead>
              <tr>
                <th>Identity</th>
                <th>Source</th>
                <th>Platform</th>
                <th>Access status</th>
                <th>Privileged</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p, i) => (
                <tr className={i === 0 ? 'selected' : ''} key={p}>
                  <td>
                    <b>{p}</b>
                    <small>{p.toLowerCase().replace(' ', '@')}.com</small>
                  </td>
                  <td>
                    ◉ GitHub
                    <br />
                    <small>acme</small>
                  </td>
                  <td>
                    ◆ acme/platform
                    <br />
                    <small>kubernetes</small>
                  </td>
                  <td>{i === 0 || i === 6 ? '● Requires review' : '● Active'}</td>
                  <td>{i === 0 || i === 1 ? 'Yes' : 'No'}</td>
                  <td>{i + 1}h ago　›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <aside className="panel">
        <b>Finding: PRV-2025-00073</b>
        <h3>⚠ Privileged access requires review</h3>
        <dl>
          <dt>Identity</dt>
          <dd>Alice Example</dd>
          <dt>Source</dt>
          <dd>GitHub (acme)</dd>
          <dt>Resource</dt>
          <dd>acme/platform</dd>
          <dt>Access</dt>
          <dd>Privileged</dd>
          <dt>Policy</dt>
          <dd>Privileged access requires review</dd>
        </dl>
        <hr />
        <b>Evidence　3</b>
        <div className="evidence">
          RoleBinding
          <br />
          <small>alice-example-cluster-admin</small>
        </div>
        <div className="evidence">
          ClusterRole
          <br />
          <small>cluster-admin</small>
        </div>
        <h3>Access Review Decision</h3>
        <div className="decisions">
          {['Approve', 'Maintain', 'Revoke'].map((x) => (
            <button
              className={decision === x ? 'chosen' : ''}
              onClick={() => setDecision(x)}
              key={x}
            >
              {x}
            </button>
          ))}
        </div>
        <textarea placeholder="Add a comment (optional)..." />
        <button className="submit">Submit Decision</button>
      </aside>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
