import { useEffect, useState } from "react";
import { DEVNET_PROGRAM_IDS } from "@/lib/deployment";

export interface DevnetReceiptsStripProps {
  authVkHash: string | null;
}

export function shortHash(s: string, head = 6, tail = 6): string {
  if (!s || s.length <= head + tail + 1) return s || "";
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

interface Cell {
  label: string;
  value: string | null;
  href: string;
  verifyLabel?: string;
}

export function DevnetReceiptsStrip({ authVkHash }: DevnetReceiptsStripProps) {
  const cells: Cell[] = [
    {
      label: "Verifier program",
      value: shortHash(DEVNET_PROGRAM_IDS.verifier),
      href: `https://explorer.solana.com/address/${DEVNET_PROGRAM_IDS.verifier}?cluster=devnet`,
      verifyLabel: "explorer ↗",
    },
    {
      label: "Registry program",
      value: shortHash(DEVNET_PROGRAM_IDS.registry),
      href: `https://explorer.solana.com/address/${DEVNET_PROGRAM_IDS.registry}?cluster=devnet`,
      verifyLabel: "explorer ↗",
    },
    {
      label: "Auth circuit VK",
      value: authVkHash ? shortHash(authVkHash, 6, 6) : null,
      href: "/ceremony#auth",
      verifyLabel: "ceremony ↗",
    },
    {
      label: "Source",
      value: "TonySucess/veilrail",
      href: "https://github.com/TonySucess/veilrail",
      verifyLabel: "github ↗",
    },
  ];

  return (
    <section className="w-full border-y border-border bg-card/40">
      <div className="container max-w-6xl mx-auto px-4 py-5 grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4">
        {cells.map((c) => (
          <div key={c.label} className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80">
              {c.label}
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-3">
              <span className="font-mono text-[12px] text-foreground/90 truncate" aria-live="polite">
                {c.value ?? "…"}
              </span>
              <a
                href={c.href}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-accent shrink-0"
              >
                {c.verifyLabel ?? "verify ↗"}
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export interface InlineReceiptProps {
  label?: string;
  value?: string | null;
  href: string;
  verifyLabel?: string;
  className?: string;
}

/**
 * Tighter, inline-flow variant of the receipts strip cell. Use this next to
 * a textual claim (e.g. inside a card or paragraph) so the audit anchor sits
 * directly beside the assertion it verifies. Visual language matches the
 * hero strip: mono uppercase label, short value, "verify ↗" suffix.
 */
export function InlineReceipt({
  label,
  value,
  href,
  verifyLabel = "verify ↗",
  className,
}: InlineReceiptProps) {
  return (
    <span
      className={`inline-flex items-baseline flex-wrap gap-x-2 gap-y-0.5 font-mono text-[11px] leading-tight align-middle ${className ?? ""}`}
    >
      {label && (
        <span className="uppercase tracking-[0.14em] text-muted-foreground/80">
          {label}
        </span>
      )}
      {value && <span className="text-foreground/90 break-all">{value}</span>}
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="uppercase tracking-[0.14em] text-muted-foreground hover:text-accent shrink-0"
      >
        {verifyLabel}
      </a>
    </span>
  );
}

export interface VkHashes {
  veil_auth?: string | null;
  veil_completion?: string | null;
  veil_pool_note?: string | null;
}

/**
 * Fetch the per-circuit `vk_sha256` values from the published
 * `ceremony/vk-hashes.json` manifest. Returns nulls until the fetch
 * resolves so callers can render a "…" placeholder without layout shift.
 */
export function useVkHashes(): VkHashes {
  const [hashes, setHashes] = useState<VkHashes>({
    veil_auth: null,
    veil_completion: null,
    veil_pool_note: null,
  });

  useEffect(() => {
    let cancelled = false;
    const base = import.meta.env.BASE_URL.endsWith("/")
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`;
    fetch(`${base}ceremony/vk-hashes.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.circuits) return;
        setHashes({
          veil_auth: data.circuits.veil_auth?.vk_sha256 ?? null,
          veil_completion: data.circuits.veil_completion?.vk_sha256 ?? null,
          veil_pool_note: data.circuits.veil_pool_note?.vk_sha256 ?? null,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return hashes;
}
