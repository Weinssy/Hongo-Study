import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const tasks = process.argv.slice(2);
if (tasks.length === 0) {
  console.error('Usage: node scripts/run-gradle.mjs <gradle-task> [...args]');
  process.exit(1);
}

const androidDir = resolve('android');
const isWin = process.platform === 'win32';
const wrapper = resolve(androidDir, isWin ? 'gradlew.bat' : 'gradlew');

if (!existsSync(wrapper)) {
  console.error(`Android Gradle wrapper not found at ${wrapper}. Run "npx cap add android" first.`);
  process.exit(1);
}

const command = isWin ? (process.env.ComSpec || 'cmd.exe') : './gradlew';
const args = isWin ? ['/c', 'gradlew.bat', ...tasks] : tasks;

try {
  execFileSync(command, args, { cwd: androidDir, stdio: 'inherit' });
} catch (error) {
  process.exit(typeof error.status === 'number' ? error.status : 1);
}
