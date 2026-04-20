#!/usr/bin/env node
// Reads the real .r1cs files and the circom Merkle depth and writes
// artifacts/veilrail/public/data/circuit-stats.json. Run as part of the
// VeilRail build (`prebuild` hook) so the home page can render numbers
// that are reproducible by anyone re-running this script.
// Fails the build hard if any expected .r1cs is missing — we would
// rather break the build than ship zeroed-out provenance.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");

const r1cs = (name) => resolve(repoRoot, `packages/circuits/build/${name}/${name}.r1cs`);
const circoms = {
  veil_auth: "packages/circuits/src/veil_auth.circom",
  veil_completion: "packages/circuits/src/veil_completion.circom",
  veil_pool_note: "packages/circuits/src/veil_pool_note.circom",
};

// Parse # of Constraints from the .r1cs binary header.
// .r1cs format: magic "r1cs" (4) | version u32 | nSections u32
// then sections of: type u32 | size u64 | data.
// Section type 1 (header) has: fieldSize u32 | prime[fieldSize] |
//   nWires u32 | nPubOut u32 | nPubIn u32 | nPrvIn u32 | nLabels u64 | nConstraints u32.
function readConstraints(filePath) {
  const buf = readFileSync(filePath);
  if (buf.toString("utf8", 0, 4) !== "r1cs") throw new Error(`not r1cs: ${filePath}`);
  const nSections = buf.readUInt32LE(8);
  let off = 12;
  for (let i = 0; i < nSections; i++) {
    const sectionType = buf.readUInt32LE(off);
    const sectionLen = Number(buf.readBigUInt64LE(off + 4));
    const dataOff = off + 12;
    if (sectionType === 1) {
      let p = dataOff;
      const fieldSize = buf.readUInt32LE(p); p += 4;
      p += fieldSize;
      const nWires = buf.readUInt32LE(p); p += 4;
      const nPubOut = buf.readUInt32LE(p); p += 4;
      const nPubIn = buf.readUInt32LE(p); p += 4;
      const nPrvIn = buf.readUInt32LE(p); p += 4;
      p += 8; // nLabels u64
      const nConstraints = buf.readUInt32LE(p);
      return { nWires, nPubOut, nPubIn, nPrvIn, nConstraints };
    }
    off = dataOff + sectionLen;
  }
  throw new Error(`section 1 not found in ${filePath}`);
}

function readPoolDepth() {
  const src = readFileSync(resolve(repoRoot, circoms.veil_pool_note), "utf8");
  const m = src.match(/component\s+main\s*\{[^}]*\}\s*=\s*VeilPoolNote\((\d+)\)/);
  if (!m) throw new Error("could not find VeilPoolNote(N) main component");
  return Number(m[1]);
}

function gitCommit() {
  try { return execSync("git rev-parse --short HEAD", { cwd: repoRoot }).toString().trim(); }
  catch { return null; }
}

const out = {
  generatedAt: new Date().toISOString(),
  sourceCommit: gitCommit(),
  circuits: {},
  pool: {},
};

let total = 0;
for (const name of Object.keys(circoms)) {
  if (!existsSync(r1cs(name))) {
    console.error(
      `[dump-stats] FATAL: required artifact missing: ${r1cs(name)}\n` +
      `  Run \`pnpm --filter @veilrail/circuits build\` first to compile circuits.`,
    );
    process.exit(1);
  }
  const stats = readConstraints(r1cs(name));
  out.circuits[name] = {
    constraints: stats.nConstraints,
    wires: stats.nWires,
    privateInputs: stats.nPrvIn,
    publicInputs: stats.nPubIn,
    sourcePath: relative(repoRoot, resolve(repoRoot, circoms[name])),
    r1csPath: relative(repoRoot, r1cs(name)),
  };
  total += stats.nConstraints;
}
out.totalConstraints = total;

const depth = readPoolDepth();
out.pool = {
  depth,
  capacity: 2 ** depth,
  capacityExpr: `2^${depth}`,
  sourcePath: circoms.veil_pool_note,
};

const dest = resolve(repoRoot, "artifacts/veilrail/public/data/circuit-stats.json");
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
console.log("wrote", relative(repoRoot, dest), "—", total, "constraints, depth", depth);
