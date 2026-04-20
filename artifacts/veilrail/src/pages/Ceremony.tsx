import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { PublicKey } from "@solana/web3.js";
import { DEVNET_PROGRAM_IDS } from "../lib/deployment";

type FileEntry = {
  phase: "phase1" | "phase2";
  kind: string;
  file: string;
  relative_path: string;
  size_bytes: number;
  sha256: string;
  url: string;
  contributor?: string;
  contribution_index?: number;
};

type DownloadIndex = {
  generated: string;
  pot_power: number;
  base_url: string;
  transcript: string;
  vk_hashes: string;
  files: FileEntry[];
};

type CircuitHashes = {
  circuit_id?: number;
  zkey_sha256: string | null;
  vk_sha256: string | null;
  vk_onchain_sha256?: string | null;
};

type VkHashes = {
  _comment?: string;
  ptau: { file: string | null; sha256: string | null };
  circuits: Record<string, CircuitHashes>;
};

type OnChainState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ok"; bytesLen: number; sha256: string }
  | { status: "error"; message: string };

function asset(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function rpcEndpoint(): string {
  const override = (import.meta.env.VITE_SOLANA_RPC_URL as string | undefined) ?? "";
  if (override.length > 0) return override;
  if (import.meta.env.DEV && typeof window !== "undefined") {
    const base = import.meta.env.BASE_URL.endsWith("/")
      ? import.meta.env.BASE_URL.slice(0, -1)
      : import.meta.env.BASE_URL;
    return `${window.location.origin}${base}/devnet-rpc`;
  }
  return "https://api.devnet.solana.com";
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcEndpoint(), {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`rpc ${method} failed: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? JSON.stringify(json.error));
  return json.result as T;
}

function vkPda(circuitId: number): PublicKey {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("vk"), new Uint8Array([circuitId])],
    new PublicKey(DEVNET_PROGRAM_IDS.verifier),
  )[0];
}

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  // Copy into a fresh ArrayBuffer to satisfy SubtleCrypto's BufferSource type
  // (Uint8Array.buffer can be a SharedArrayBuffer in some bundlers).
  const buf = bytes.slice().buffer;
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const view = new Uint8Array(digest);
  let hex = "";
  for (const b of view) hex += b.toString(16).padStart(2, "0");
  return hex;
}

async function fetchOnChainVk(circuitId: number): Promise<OnChainState> {
  try {
    const pda = vkPda(circuitId);
    const result = await rpc<{ value: { data: [string, string]; owner: string } | null }>(
      "getAccountInfo",
      [pda.toBase58(), { encoding: "base64" }],
    );
    if (!result.value) return { status: "missing" };
    const [b64] = result.value.data;
    const bytes = decodeBase64(b64);
    // Vk layout: 8 (anchor disc) + 1 (circuit_id) + 4 (bytes_len LE) + 4096 (bytes) + 1 (bump)
    if (bytes.length < 8 + 1 + 4) {
      return { status: "error", message: "vk account too small" };
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const bytesLen = view.getUint32(8 + 1, true);
    const dataStart = 8 + 1 + 4;
    if (dataStart + bytesLen > bytes.length) {
      return { status: "error", message: "vk bytes_len exceeds account size" };
    }
    const vkBytes = bytes.subarray(dataStart, dataStart + bytesLen);
    return { status: "ok", bytesLen, sha256: await sha256Hex(vkBytes) };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : String(e) };
  }
}

export function Ceremony() {
  const [index, setIndex] = useState<DownloadIndex | null>(null);
  const [hashes, setHashes] = useState<VkHashes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onChain, setOnChain] = useState<Record<string, OnChainState>>({});

  useEffect(() => {
    document.title = "Trusted setup ceremony — VeilRail";
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(asset("ceremony/download-index.json")).then((r) => {
        if (!r.ok) throw new Error(`download-index.json: ${r.status}`);
        return r.json() as Promise<DownloadIndex>;
      }),
      fetch(asset("ceremony/vk-hashes.json")).then((r) => {
        if (!r.ok) throw new Error(`vk-hashes.json: ${r.status}`);
        return r.json() as Promise<VkHashes>;
      }),
    ])
      .then(([idx, vk]) => {
        if (cancelled) return;
        setIndex(idx);
        setHashes(vk);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hashes) return;
    let cancelled = false;
    const entries = Object.entries(hashes.circuits);
    setOnChain((prev) => {
      const next = { ...prev };
      for (const [name] of entries) next[name] = { status: "loading" };
      return next;
    });
    (async () => {
      for (const [name, h] of entries) {
        if (cancelled) return;
        const cid = typeof h.circuit_id === "number" ? h.circuit_id : null;
        if (cid === null) {
          setOnChain((p) => ({
            ...p,
            [name]: { status: "error", message: "no circuit_id in vk-hashes.json" },
          }));
          continue;
        }
        const state = await fetchOnChainVk(cid);
        if (cancelled) return;
        setOnChain((p) => ({ ...p, [name]: state }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hashes]);

  const phase1 = index?.files.filter((f) => f.phase === "phase1") ?? [];
  const phase2ByCircuit = new Map<string, FileEntry[]>();
  for (const f of index?.files.filter((x) => x.phase === "phase2") ?? []) {
    const circuit = f.relative_path.split("/")[1] ?? "unknown";
    const arr = phase2ByCircuit.get(circuit) ?? [];
    arr.push(f);
    phase2ByCircuit.set(circuit, arr);
  }

  const mismatchCount = useMemo(() => {
    if (!hashes) return 0;
    let n = 0;
    for (const [name, h] of Object.entries(hashes.circuits)) {
      const s = onChain[name];
      if (!s || s.status !== "ok") continue;
      if (h.vk_onchain_sha256 && h.vk_onchain_sha256 !== s.sha256) n++;
    }
    return n;
  }, [hashes, onChain]);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-16 space-y-12">
      <header className="space-y-4">
        <span className="text-xs font-mono uppercase tracking-wider text-accent">
          Trusted setup
        </span>
        <h1 className="text-4xl font-bold">Ceremony transcript & proving keys</h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-3xl">
          VeilRail's three Groth16 circuits are produced by a multi-party
          ceremony coordinated through{" "}
          <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted">
            packages/circuits/scripts/ceremony.sh
          </code>
          . Every contribution file, the finalized proving keys, and their
          sha256 hashes are published below so anyone can independently re-run
          the verification and confirm that the on-chain verifier program is
          pinned to these exact bytes.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">How to re-verify</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground leading-relaxed">
          <li>
            Download the transcript at{" "}
            <a href={asset("ceremony/TRANSCRIPT.md")} className="text-accent hover:underline" target="_blank" rel="noreferrer">
              TRANSCRIPT.md
            </a>{" "}
            and the per-circuit hash manifest{" "}
            <a href={asset("ceremony/vk-hashes.json")} className="text-accent hover:underline" target="_blank" rel="noreferrer">
              vk-hashes.json
            </a>
            .
          </li>
          <li>
            Download every file from the table below (or the full machine-readable{" "}
            <a href={asset("ceremony/download-index.json")} className="text-accent hover:underline" target="_blank" rel="noreferrer">
              download-index.json
            </a>
            ).
          </li>
          <li>
            Run <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted">sha256sum &lt;file&gt;</code>{" "}
            and confirm the output matches the sha256 column. Then run{" "}
            <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted">snarkjs powersoftau verify</code>{" "}
            on each ptau and{" "}
            <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted">snarkjs zkey verify</code>{" "}
            on each zkey to chain-verify the contributions.
          </li>
          <li>
            The "On-chain VK pinning" section below reads each circuit's
            currently-pinned vk hash from the deployed{" "}
            <code className="font-mono text-xs">veil-verifier</code> program on
            devnet and compares it against{" "}
            <code className="font-mono text-xs">vk_onchain_sha256</code> from{" "}
            <code className="font-mono text-xs">vk-hashes.json</code> — any
            drift is shown as a loud MISMATCH.
          </li>
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Pre-ceremony commitments</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
          Before any contributor runs <code className="font-mono text-xs">ceremony.sh init</code>,
          the named contributor roster and the public random beacon source are
          fixed in advance and signed by every contributor. These files are
          what bind the on-chain <code className="font-mono text-xs">vk_sha256</code>
          {" "}to a publicly committed-to set of independent parties and an
          unpredictable beacon.
        </p>
        <ul className="text-sm space-y-2">
          <li>
            <a href={asset("ceremony/CONTRIBUTORS.md")} className="text-accent hover:underline font-mono text-xs" target="_blank" rel="noreferrer">
              CONTRIBUTORS.md
            </a>{" "}
            <span className="text-muted-foreground">
              — published roster of four independent parties per phase, each
              with an SSH Ed25519 signing key. Detached signatures live at{" "}
            </span>
            <a href={asset("ceremony/CONTRIBUTORS.md.sig")} className="text-accent hover:underline font-mono text-xs" target="_blank" rel="noreferrer">
              CONTRIBUTORS.md.sig
            </a>
            <span className="text-muted-foreground">, public keys at </span>
            <a href={asset("ceremony/keys/")} className="text-accent hover:underline font-mono text-xs" target="_blank" rel="noreferrer">
              keys/
            </a>
            <span className="text-muted-foreground">, principal map at </span>
            <a href={asset("ceremony/allowed_signers")} className="text-accent hover:underline font-mono text-xs" target="_blank" rel="noreferrer">
              allowed_signers
            </a>
            <span className="text-muted-foreground">.</span>
          </li>
          <li>
            <a href={asset("ceremony/BEACON.md")} className="text-accent hover:underline font-mono text-xs" target="_blank" rel="noreferrer">
              BEACON.md
            </a>{" "}
            <span className="text-muted-foreground">
              — Bitcoin mainnet block height committed in advance; its block hash
              becomes the SHA-256<sup>10</sup> beacon applied to finalize each phase.
            </span>
          </li>
          <li>
            <a href={asset("ceremony/ATTESTATION_TEMPLATE.md")} className="text-accent hover:underline font-mono text-xs" target="_blank" rel="noreferrer">
              ATTESTATION_TEMPLATE.md
            </a>{" "}
            <span className="text-muted-foreground">
              — what each contributor clearsigns and publishes within 24h of
              their turn (host, randomness source, toxic-waste destruction).
            </span>
          </li>
        </ul>
      </section>

      {error && (
        <div className="p-5 rounded border border-destructive/50 bg-destructive/10 text-sm">
          Failed to load ceremony manifest: {error}
        </div>
      )}

      {hashes && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Pinned on-chain hashes</h2>
          {hashes._comment && (
            <p className="text-xs text-muted-foreground italic leading-relaxed">
              {hashes._comment}
            </p>
          )}
          <div className="rounded border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Circuit</th>
                  <th className="text-left px-4 py-3 font-medium">zkey sha256</th>
                  <th className="text-left px-4 py-3 font-medium">vk sha256 (json)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(hashes.circuits).map(([name, h], i) => (
                  <tr key={name} className={i > 0 ? "border-t border-border" : ""}>
                    <td className="px-4 py-3 font-mono text-xs">{name}</td>
                    <td className="px-4 py-3 font-mono text-xs break-all text-muted-foreground">
                      {h.zkey_sha256 ?? <span className="italic">pending</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs break-all text-accent">
                      {h.vk_sha256 ?? <span className="italic text-muted-foreground">pending</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {hashes && (
        <OnChainPinning hashes={hashes} onChain={onChain} mismatchCount={mismatchCount} />
      )}

      {index && (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Published artifacts</h2>
          <p className="text-xs text-muted-foreground">
            Manifest generated {index.generated}. Hosting base URL:{" "}
            <code className="font-mono">{index.base_url}</code>. Re-publishing
            with{" "}
            <code className="font-mono">CEREMONY_DOWNLOAD_BASE_URL=…</code>{" "}
            updates every download link below.
          </p>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">
              Phase 1 — powers-of-tau (BN254, 2^{index.pot_power})
            </h3>
            {phase1.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No phase-1 artifacts published yet.
              </p>
            ) : (
              <ArtifactTable rows={phase1} />
            )}
          </div>

          {[...phase2ByCircuit.entries()].map(([circuit, rows]) => (
            <div key={circuit} className="space-y-3">
              <h3 className="text-lg font-semibold">
                Phase 2 — <span className="font-mono">{circuit}</span>
              </h3>
              <ArtifactTable rows={rows} />
            </div>
          ))}

          {phase2ByCircuit.size === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No phase-2 artifacts published yet.
            </p>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Related</h2>
        <ul className="text-sm space-y-2 text-muted-foreground">
          <li>
            <Link href="/security" className="text-accent hover:underline">
              Security
            </Link>{" "}
            — trust assumptions and threat model.
          </li>
          <li>
            <Link href="/docs" className="text-accent hover:underline">
              Docs
            </Link>{" "}
            — SDK quickstart and integration guides.
          </li>
          <li>
            <a
              href="https://github.com/TonySucess/veilrail/blob/main/packages/circuits/README.md#mainnet-trusted-setup"
              className="text-accent hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Coordinator runbook
            </a>{" "}
            — how the ceremony is orchestrated.
          </li>
        </ul>
      </section>

      <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
        The roster, signatures, and pinned beacon height linked above are dry-run
        placeholders generated to exercise the signing and verification pipeline
        end-to-end. They will be replaced by a v1 slate co-signed by four
        independent third parties, recruited off-platform, before the mainnet
        ceremony begins.
      </p>
    </div>
  );
}

function OnChainPinning({
  hashes,
  onChain,
  mismatchCount,
}: {
  hashes: VkHashes;
  onChain: Record<string, OnChainState>;
  mismatchCount: number;
}) {
  return (
    <section className="space-y-4" data-testid="onchain-pinning">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h2 className="text-2xl font-semibold">On-chain VK pinning</h2>
        <span className="text-xs font-mono text-muted-foreground">
          program <span className="text-foreground">{DEVNET_PROGRAM_IDS.verifier}</span>{" "}
          (devnet)
        </span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
        For each circuit we read the <code className="font-mono text-xs">Vk</code> PDA
        (<code className="font-mono text-xs">[b"vk", circuit_id]</code>) from the
        deployed verifier program, sha256 the active{" "}
        <code className="font-mono text-xs">bytes[..bytes_len]</code> slice, and
        compare it against{" "}
        <code className="font-mono text-xs">vk_onchain_sha256</code> from{" "}
        <code className="font-mono text-xs">vk-hashes.json</code>. A mismatch
        means an upgrade tx pinned a different VK than what the public ceremony
        published — anyone seeing this should treat the verifier as compromised
        until the operator re-publishes.
      </p>

      {mismatchCount > 0 && (
        <div
          data-testid="onchain-mismatch-banner"
          className="p-4 rounded border-2 border-destructive bg-destructive/15 text-sm font-semibold text-destructive flex items-start gap-3"
        >
          <span className="text-lg leading-none">✗</span>
          <span>
            {mismatchCount} circuit{mismatchCount === 1 ? "" : "s"} on-chain
            does NOT match the published vk-hashes.json. Do not rely on the
            verifier until this is reconciled.
          </span>
        </div>
      )}

      <div className="rounded border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Circuit</th>
              <th className="text-left px-4 py-3 font-medium">id</th>
              <th className="text-left px-4 py-3 font-medium">Expected vk_onchain_sha256</th>
              <th className="text-left px-4 py-3 font-medium">Live on-chain sha256</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(hashes.circuits).map(([name, h], i) => {
              const s = onChain[name] ?? { status: "loading" };
              return (
                <tr
                  key={name}
                  className={i > 0 ? "border-t border-border" : ""}
                  data-testid={`onchain-row-${name}`}
                >
                  <td className="px-4 py-3 font-mono text-xs">{name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {h.circuit_id ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] break-all">
                    {h.vk_onchain_sha256 ?? (
                      <span className="italic text-muted-foreground">not pinned in manifest</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] break-all">
                    {renderLiveHash(s)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {renderStatus(h.vk_onchain_sha256 ?? null, s)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function renderLiveHash(s: OnChainState) {
  if (s.status === "loading") return <span className="italic text-muted-foreground">loading…</span>;
  if (s.status === "missing") return <span className="italic text-muted-foreground">no Vk account</span>;
  if (s.status === "error") return <span className="italic text-destructive">{s.message}</span>;
  return s.sha256;
}

function renderStatus(expected: string | null, s: OnChainState) {
  if (s.status === "loading") {
    return <span className="text-muted-foreground">checking…</span>;
  }
  if (s.status === "error") {
    return (
      <span
        className="font-semibold text-destructive"
        data-testid="onchain-status-error"
      >
        ✗ RPC error
      </span>
    );
  }
  if (s.status === "missing") {
    return (
      <span
        className="font-semibold text-muted-foreground"
        data-testid="onchain-status-missing"
      >
        ⚠ not uploaded
      </span>
    );
  }
  if (!expected) {
    return (
      <span
        className="text-muted-foreground italic"
        data-testid="onchain-status-unverifiable"
      >
        unverifiable — fill vk_onchain_sha256
      </span>
    );
  }
  if (expected === s.sha256) {
    return (
      <span
        className="font-semibold text-emerald-600 dark:text-emerald-400"
        data-testid="onchain-status-match"
      >
        ✓ matches on-chain
      </span>
    );
  }
  return (
    <span
      className="font-semibold text-destructive"
      data-testid="onchain-status-mismatch"
    >
      ✗ MISMATCH
    </span>
  );
}

function ArtifactTable({ rows }: { rows: FileEntry[] }) {
  return (
    <div className="rounded border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-3 font-medium">File</th>
            <th className="text-left px-4 py-3 font-medium">Kind</th>
            <th className="text-left px-4 py-3 font-medium">Contributor</th>
            <th className="text-right px-4 py-3 font-medium">Size</th>
            <th className="text-left px-4 py-3 font-medium">sha256</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.relative_path} className={i > 0 ? "border-t border-border" : ""}>
              <td className="px-4 py-3 font-mono text-xs">
                <a href={r.url} className="text-accent hover:underline" target="_blank" rel="noreferrer">
                  {r.file}
                </a>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.kind}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{r.contributor ?? "—"}</td>
              <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                {formatBytes(r.size_bytes)}
              </td>
              <td className="px-4 py-3 font-mono text-[11px] break-all text-muted-foreground">
                {r.sha256}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
