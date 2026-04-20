import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ExternalLinkIcon } from "lucide-react";

type DownloadFile = {
  phase: string;
  kind: string;
  file: string;
  relative_path: string;
  contributor?: string | null;
};
type DownloadIndex = {
  files: DownloadFile[];
};

type Contributor = {
  handle: string;
  pubRelative: string; // e.g. keys/dry-run-1_ed25519.pub
};

function withBase(rel: string): string {
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : import.meta.env.BASE_URL + "/";
  return base + rel.replace(/^\/+/, "");
}

export function CeremonySummaryCard() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [fps, setFps] = useState<Record<string, string>>({});

  // 1. Source of truth: derive the contributor list from download-index.json.
  useEffect(() => {
    let cancelled = false;
    fetch(withBase("ceremony/download-index.json"))
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((idx: DownloadIndex) => {
        const handles = Array.from(
          new Set(idx.files.map(f => f.contributor).filter((h): h is string => !!h)),
        ).sort();
        const list: Contributor[] = handles.map(h => ({
          handle: h,
          pubRelative: `ceremony/keys/${h}_ed25519.pub`,
        }));
        if (!cancelled) setContributors(list);
      })
      .catch(() => { /* leave empty; UI shows skeleton */ });
    return () => { cancelled = true; };
  }, []);

  // 2. Fetch each public key body to display its short fingerprint.
  useEffect(() => {
    if (contributors.length === 0) return;
    let cancelled = false;
    Promise.all(
      contributors.map(async c => {
        try {
          const txt = await fetch(withBase(c.pubRelative)).then(r => (r.ok ? r.text() : ""));
          const parts = txt.trim().split(/\s+/);
          const body = parts[1] ?? txt.trim();
          return [c.handle, body.slice(0, 16)] as const;
        } catch {
          return [c.handle, ""] as const;
        }
      }),
    ).then(entries => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const [h, fp] of entries) next[h] = fp;
      setFps(next);
    });
    return () => { cancelled = true; };
  }, [contributors]);

  const slate = contributors.length > 0 ? contributors : Array.from({ length: 4 }).map((_, i) => ({
    handle: `dry-run-${i + 1}`,
    pubRelative: `ceremony/keys/dry-run-${i + 1}_ed25519.pub`,
  }));

  return (
    <section className="border border-border bg-card rounded-lg overflow-hidden">
      <header className="px-5 py-4 border-b border-border flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Trusted setup integrity</h2>
            <span
              className="font-mono text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded border border-border bg-muted/30 text-muted-foreground"
              data-testid="ceremony-dry-run-pill"
            >
              Pre-mainnet · dry run
            </span>
          </div>
          <p className="text-xs font-mono text-muted-foreground mt-1 normal-case">
            Four-party ceremony · Bitcoin block beacon · phase1 powers-of-tau (2^15 dev / 2^18 mainnet) · per-circuit phase2.
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed max-w-xl">
            Roster below is the published dry-run slate used to exercise the signing
            and verification pipeline end-to-end. The mainnet roster will be co-signed
            by four independent third parties recruited off-platform.
          </p>
        </div>
        <Link to="/ceremony" className="shrink-0 text-xs font-mono text-accent hover:underline inline-flex items-center gap-1">
          full transcript <ExternalLinkIcon className="w-3 h-3" />
        </Link>
      </header>
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
        {slate.map(c => (
          <li key={c.handle} className="bg-card p-4 flex flex-col gap-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{c.handle}</span>
            <span className="font-mono text-xs text-foreground truncate" title={fps[c.handle] ?? ""}>
              {fps[c.handle] ? `${fps[c.handle]}…` : "…"}
            </span>
            <a
              target="_blank"
              rel="noreferrer"
              href={withBase(c.pubRelative)}
              className="text-[10px] font-mono uppercase tracking-wider text-accent hover:underline inline-flex items-center gap-1 mt-1"
            >
              .pub ↗
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
