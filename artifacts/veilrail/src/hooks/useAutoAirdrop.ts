import { useEffect, useRef } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useToast } from "@/hooks/use-toast";
import { DEPLOYMENT_STATUS } from "@/lib/deployment";

const COOLDOWN_KEY = "veilrail.airdrop.lastAt";
const COOLDOWN_MS = 60_000;
const AUTO_AIRDROP_SESSION_PREFIX = "veilrail.airdrop.auto:";
const AIRDROP_AMOUNT_SOL = 0.05;

export interface UseAutoAirdropOptions {
  onComplete?: (newBalanceLamports: number) => void;
}

export function useAutoAirdrop(opts: UseAutoAirdropOptions = {}): void {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { toast } = useToast();
  const onCompleteRef = useRef(opts.onComplete);
  onCompleteRef.current = opts.onComplete;

  useEffect(() => {
    if (DEPLOYMENT_STATUS !== "live") return;
    if (!publicKey) return;

    const sessionKey = `${AUTO_AIRDROP_SESSION_PREFIX}${publicKey.toBase58()}`;
    if (sessionStorage.getItem(sessionKey)) return;

    const last = Number(localStorage.getItem(COOLDOWN_KEY) ?? "0");
    if (Date.now() - last < COOLDOWN_MS) return;

    let cancelled = false;
    (async () => {
      try {
        const bal = await connection.getBalance(publicKey);
        if (cancelled) return;
        if (bal !== 0) return;
        if (sessionStorage.getItem(sessionKey)) return;
        sessionStorage.setItem(sessionKey, String(Date.now()));

        const sig = await connection.requestAirdrop(
          publicKey,
          AIRDROP_AMOUNT_SOL * LAMPORTS_PER_SOL,
        );
        const bh = await connection.getLatestBlockhash();
        await connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");
        if (cancelled) return;

        localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
        const newBal = await connection.getBalance(publicKey);
        if (cancelled) return;
        onCompleteRef.current?.(newBal);
        toast({
          title: "Airdrop confirmed",
          description: `${AIRDROP_AMOUNT_SOL} SOL credited on devnet.`,
        });
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = (e as Error)?.message ?? "Airdrop failed";
        const friendly = /429|rate/i.test(msg)
          ? "Devnet faucet is rate-limiting; try again in a minute."
          : msg;
        toast({
          variant: "destructive",
          title: "Airdrop failed",
          description: friendly,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicKey, connection, toast]);
}
