import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const compose = ['compose', '-p', 'aegis-e2e', '-f', 'deploy/compose.yaml'];
const environment = {
  ...process.env,
  MASTER_KEY: randomBytes(32).toString('base64'),
  AEGIS_API_PORT: process.env.AEGIS_API_PORT ?? '3300',
  AEGIS_CONSOLE_PORT: process.env.AEGIS_CONSOLE_PORT ?? '43173',
};
environment.PLAYWRIGHT_TEST_BASE_URL ??= `http://127.0.0.1:${environment.AEGIS_CONSOLE_PORT}`;
environment.E2E_API_URL ??= `http://127.0.0.1:${environment.AEGIS_API_PORT}`;

try {
  run(
    'docker',
    [...compose, 'up', ...(process.env.E2E_SKIP_BUILD ? [] : ['--build']), '--wait'],
    environment,
  );
  run('pnpm', ['--filter', '@aegis/e2e', 'test:e2e'], environment);
} finally {
  run('docker', [...compose, 'down', '--volumes', '--remove-orphans'], environment, true);
}

function run(command, argumentsList, env, allowFailure = false) {
  const executable = process.platform === 'win32' && command === 'pnpm' ? 'pnpm.cmd' : command;
  const result = spawnSync(executable, argumentsList, {
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status && !allowFailure) {
    throw new Error(`${executable} ${argumentsList.join(' ')} exited with ${result.status}`);
  }
}
