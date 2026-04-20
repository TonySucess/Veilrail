import { useEffect, useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { CheckIcon, CopyIcon, DropletIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAutoAirdrop } from "@/hooks/useAutoAirdrop";
import { shortAddr } from "./utils";

const COOLDOWN_KEY = "veilrail.airdrop.lastAt";
const COOLDOWN_MS = 60_000;

export function ConnectWalletPanel() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const { toast } = useToast();
  const [balance, setBalance] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [airdropping, setAirdropping] = useState(false);
  const [, force] = useState(0);

  useEffect(() => {
    if (!publicKey) { setBalance(null); return; }
    let cancelled = false;
    connection.getBalance(publicKey).then(v => { if (!cancelled) setBalance(v / LAMPORTS_PER_SOL); }).catch(() => {});
    return () => { cancelled = true; };
  }, [publicKey, connection]);

  useAutoAirdrop({
    onComplete: (lamports) => setBalance(lamports / LAMPORTS_PER_SOL),
  });

  useEffect(() => {
    const id = window.setInterval(() => force(x => x + 1), 1_000);
    return () => window.clearInterval(id);
  }, []);

  const cooldownRemaining = (() => {
    const last = Number(localStorage.getItem(COOLDOWN_KEY) ?? "0");
    const ms = COOLDOWN_MS - (Date.now() - last);
    return ms > 0 ? Math.ceil(ms / 1000) : 0;
  })();

  const onCopy = () => {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey.toBase58());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const onAirdrop = useCallback(async () => {
    if (!publicKey) return;
    setAirdropping(true);
    try {
      const sig = await connection.requestAirdrop(publicKey, 0.05 * LAMPORTS_PER_SOL);
      const bh = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");
      const v = await connection.getBalance(publicKey);
      setBalance(v / LAMPORTS_PER_SOL);
      localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      toast({ title: "Airdrop confirmed", description: "0.05 SOL credited on devnet." });
    } catch (e: unknown) {
      const msg = (e as Error)?.message ?? "Airdrop failed";
      const friendly = /429|rate/i.test(msg)
        ? "Devnet faucet is rate-limiting; try again in a minute."
        : msg;
      toast({ variant: "destructive", title: "Airdrop failed", description: friendly });
    } finally {
      setAirdropping(false);
    }
  }, [publicKey, connection, toast]);

  return (
    <section className="border border-border bg-card rounded-lg overflow-hidden">
      <div className="px-5 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-semibold">Broadcast your own proof</h2>
          <p className="text-xs font-mono text-muted-foreground mt-1 normal-case">
            Connecting a wallet lets you submit a proof from this browser to the devnet verifier. Everything above is verifiable without it.
          </p>
        </div>
        <div className="shrink-0">
          <WalletMultiButton />
        </div>
      </div>
      {connected && publicKey && (
        <div className="border-t border-border grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="p-5 flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">connected key</span>
            <span className="flex items-center gap-2">
              <span className="font-mono text-sm text-foreground">{shortAddr(publicKey.toBase58())}</span>
              <button onClick={onCopy} className="text-muted-foreground hover:text-foreground" aria-label="copy address">
                {copied ? <CheckIcon className="w-4 h-4 text-accent" /> : <CopyIcon className="w-4 h-4" />}
              </button>
            </span>
          </div>
          <div className="p-5 flex flex-col gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">devnet sol</span>
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-sm text-foreground">{balance !== null ? balance.toFixed(4) : "…"}</span>
              <button
                onClick={onAirdrop}
                disabled={airdropping || cooldownRemaining > 0 || (balance !== null && balance > 0.05)}
                className="inline-flex items-center gap-1 px-2 py-1 border border-border rounded text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-accent/40 disabled:opacity-50 disabled:hover:text-muted-foreground disabled:hover:border-border"
              >
                <DropletIcon className="w-3 h-3" />
                {airdropping
                  ? "requesting…"
                  : cooldownRemaining > 0
                    ? `wait ${cooldownRemaining}s`
                    : balance !== null && balance > 0.05
                      ? "balance ok"
                      : "airdrop 0.05"}
              </button>
            </div>
          </div>
          <div className="p-5 flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">status</span>
            <span className="font-mono text-sm text-accent flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent" /> online
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
