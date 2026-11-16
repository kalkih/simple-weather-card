// Works out the next release tag from the existing tags.
//
//   node next-version.mjs <patch|minor|major> <beta: true|false>
//
// Prints `tag`, `version` and `previous` (the tag to generate release notes
// from) as GitHub Actions outputs. Stable releases bump the latest stable
// tag. Betas get the same base version with a -beta-N suffix, counting up.
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const STABLE = /^v(\d+)\.(\d+)\.(\d+)$/;
const BUMPS = ["patch", "minor", "major"];

const parse = (tag) => STABLE.exec(tag)?.slice(1).map(Number);

const compare = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

export const nextVersion = (tags, bump, beta) => {
  if (!BUMPS.includes(bump)) throw new Error(`Unknown bump: ${bump}`);

  const stable = tags.map(parse).filter(Boolean).sort(compare);
  const latest = stable.at(-1) ?? [0, 0, 0];
  const [major, minor, patch] = latest;
  const base = {
    patch: `${major}.${minor}.${patch + 1}`,
    minor: `${major}.${minor + 1}.0`,
    major: `${major + 1}.0.0`,
  }[bump];
  const latestTag = stable.length > 0 ? `v${latest.join(".")}` : undefined;

  if (!beta) return { tag: `v${base}`, version: base, previous: latestTag };

  const betaPattern = new RegExp(
    `^v${base.replaceAll(".", "\\.")}-beta-(\\d+)$`,
  );
  const betas = tags
    .map((tag) => Number(betaPattern.exec(tag)?.[1]))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
  const last = betas.at(-1);
  const number = (last ?? 0) + 1;
  return {
    tag: `v${base}-beta-${number}`,
    version: `${base}-beta-${number}`,
    previous: last !== undefined ? `v${base}-beta-${last}` : latestTag,
  };
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [bump, beta] = process.argv.slice(2);
  const tags = execFileSync("git", ["tag", "--list", "v*"], {
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
  const result = nextVersion(tags, bump, beta === "true");
  for (const [key, value] of Object.entries(result)) {
    console.log(`${key}=${value ?? ""}`);
  }
}
