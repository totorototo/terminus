import { spawnSync } from "child_process";
import { join } from "path";

const env = { ...process.env };
if (process.platform === "darwin") {
  env.PATH = `${join(process.cwd(), ".bin")}:${env.PATH}`;
}

const [cmd, ...args] = process.argv.slice(2);
const result = spawnSync(cmd, args, {
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
