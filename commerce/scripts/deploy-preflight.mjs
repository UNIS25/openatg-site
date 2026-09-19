import { execFileSync } from "node:child_process";
const root = new URL("../../", import.meta.url);
const git = (...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
for (const commit of ["0a5a509", "5cde291"]) {
  try {
    git("merge-base", "--is-ancestor", commit, "HEAD");
  } catch {
    throw Error(
      `Publication blocked: required preserved commit ${commit} is missing from this branch.`,
    );
  }
}
if (git("status", "--porcelain"))
  throw Error("Commit and review outstanding changes before publication.");
const remote = git("ls-remote", "origin", "refs/heads/main").split(/\s/)[0];
if (
  !process.env.REVIEWED_REMOTE_SHA ||
  remote !== process.env.REVIEWED_REMOTE_SHA
)
  throw Error(
    "Remote main differs from REVIEWED_REMOTE_SHA. Integrate and verify it before pushing.",
  );
const url = new URL(process.env.VITE_SUPABASE_URL ?? "");
if (
  url.protocol !== "https:" ||
  url.pathname !== "/" ||
  !process.env.VITE_SUPABASE_PUBLISHABLE_KEY
)
  throw Error("Production backend public configuration is required.");
console.log(
  `Preflight passed at ${git("rev-parse", "HEAD")}; remote main ${remote}. No push was performed.`,
);
