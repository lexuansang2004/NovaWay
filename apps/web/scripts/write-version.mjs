// R3-3 (docs/roadmap/SPRINT_R3_VERIFICATION_CD_HARDENING.md) — writes
// public/version.json before `vite build` copies public/ into dist/, so the
// deployed bundle exposes which commit it was built from at
// <site>/version.json. VERCEL_GIT_COMMIT_SHA is a Vercel-provided build-time
// env var (requires "Enable access to System Environment Variables" in
// Vercel project settings) — falls back to "unknown" for local/CI builds
// where it isn't set, which is itself a useful signal if it ever shows up
// on a real deploy (means the toggle got disabled).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const outPath = fileURLToPath(new URL('../public/version.json', import.meta.url));
const commitSha = process.env.VERCEL_GIT_COMMIT_SHA ?? 'unknown';

writeFileSync(outPath, JSON.stringify({ commit_sha: commitSha }));
console.log(`Wrote ${outPath} with commit_sha=${commitSha}`);
