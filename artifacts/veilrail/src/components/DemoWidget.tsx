import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { generateDemoProof, type ProofOutput } from "@/lib/demoProof";
import { recordAndSubmitDemoProof } from "@/lib/submitDemoProof";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WalletProviders } from "@/components/WalletProviders";

function DemoWidgetInner() {
  const [agentId, setAgentId] = useState("agent_8af2");
  const [amount, setAmount] = useState("100");
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<{ stage: string; ms: number; hex: string }[]>([]);
  const [result, setResult] = useState<ProofOutput | null>(null);
  const [submitNote, setSubmitNote] = useState<string | null>(null);
  const wallet = useWallet();
  const { connection } = useConnection();

  const runProof = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setProgress([]);
    setResult(null);
    setSubmitNote(null);

    try {
      const out = await generateDemoProof(
        { agentId, sessionAmount: Number(amount) },
        (stage, ms, hex) => {
          setProgress((p) => [...p, { stage, ms, hex }]);
        },
      );
      setResult(out);

      const entry = await recordAndSubmitDemoProof({
        output: out,
        page: "home",
        connection,
        wallet: wallet.publicKey
          ? {
              publicKey: wallet.publicKey,
              signTransaction: wallet.signTransaction!,
              signAllTransactions: wallet.signAllTransactions!,
            }
          : null,
      });
      if (entry.status === "submitted") {
        setSubmitNote(`Broadcast: ${entry.signature?.slice(0, 16)}…`);
      } else if (entry.status === "failed") {
        setSubmitNote(`Submit failed: ${entry.error ?? "unknown error"}`);
      } else {
        setSubmitNote("Recorded locally — connect a wallet to broadcast.");
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto border border-border bg-card rounded-lg overflow-hidden text-left">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Live in your browser</h3>
          <p className="text-sm mt-1">Generate a real Groth16 proof against the devnet circuit.</p>
        </div>
      </div>

      <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-1">
          <Label htmlFor="agentId" className="text-xs text-muted-foreground font-mono">Agent id</Label>
          <Input
            id="agentId"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="h-9 font-mono text-xs mt-1 bg-background"
            disabled={isRunning}
          />
        </div>
        <div className="sm:col-span-1">
          <Label htmlFor="amount" className="text-xs text-muted-foreground font-mono">Amount (USDC)</Label>
          <Input
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-9 font-mono text-xs mt-1 bg-background"
            disabled={isRunning}
          />
        </div>
        <div className="sm:col-span-1 flex items-end">
          <Button
            onClick={runProof}
            disabled={isRunning}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-medium"
          >
            {isRunning ? "Generating proof…" : result ? "Run again" : "Generate proof"}
          </Button>
        </div>
      </div>

      {(progress.length > 0 || result) && (
        <div className="px-6 py-5 border-t border-border bg-background/40">
          {progress.length > 0 && (
            <div className="space-y-1.5 font-mono text-xs">
              {progress.map((p, i) => (
                <div key={i} className="flex justify-between items-center text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className="text-accent">+</span>
                    {p.stage}
                  </span>
                  <span>{p.ms}ms</span>
                </div>
              ))}
              {isRunning && (
                <div className="flex items-center gap-2 text-muted-foreground animate-pulse pt-1">
                  <span className="w-2 h-2 rounded-full bg-accent/50 inline-block" />
                  Working…
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-accent">{result.elapsedMs}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Verify</span>
                  <span className={result.verified ? "text-accent" : "text-destructive"}>
                    {result.verified ? "OK (groth16/bn128)" : "FAILED"}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Session root (public)</Label>
                <div className="px-2 py-1.5 bg-background border border-border rounded font-mono text-[10px] break-all text-muted-foreground">
                  0x{result.commitment}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">π_A</Label>
                <div className="px-2 py-1.5 bg-background border border-border rounded font-mono text-[10px] break-all text-muted-foreground">
                  0x{result.proofA}
                </div>
              </div>
              {submitNote && (
                <div className="font-mono text-[11px] text-accent break-all">{submitNote}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DemoWidget() {
  return (
    <WalletProviders>
      <DemoWidgetInner />
    </WalletProviders>
  );
}
