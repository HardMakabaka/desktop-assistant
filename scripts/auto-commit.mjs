import { spawnSync } from 'node:child_process';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function output(command, args) {
  const result = spawnSync(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf-8',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    if (stderr) {
      process.stderr.write(`${stderr}\n`);
    }
    process.exit(result.status ?? 1);
  }

  return (result.stdout || '').trim();
}

const message = process.argv.slice(2).join(' ').trim();
if (!message) {
  process.stderr.write('Usage: npm run auto:commit -- "your commit message"\n');
  process.exit(1);
}

const statusBefore = output('git', ['status', '--porcelain']);
if (!statusBefore) {
  process.stdout.write('No local changes to commit.\n');
  process.exit(0);
}

process.stdout.write('Running project verification before commit...\n');
run('npm', ['run', 'verify']);

process.stdout.write('Staging all tracked and untracked changes...\n');
run('git', ['add', '-A']);

const statusAfterAdd = output('git', ['status', '--porcelain']);
if (!statusAfterAdd) {
  process.stdout.write('No staged changes after verification. Nothing to commit.\n');
  process.exit(0);
}

process.stdout.write('Creating commit...\n');
run('git', ['commit', '-m', message]);

process.stdout.write('Commit created successfully.\n');
