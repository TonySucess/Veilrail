import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { generateDemoProof } from "@/lib/demoProof";
import { recordAndSubmitDemoProof } from "@/lib/submitDemoProof";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WalletProviders } from "@/components/WalletProviders";

function PlaygroundInner() {
  const [inputJson, setInputJson] = useState(`{
  "agentId": "agent_8af2",
  "sessionAmount": 100,
  "recipientPubkey": "7Xv...9aZ"
}`);
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const wallet = useWallet();
  const { connection } = useConnection();

  useEffect(() => {
    document.title = "Playground — VeilRail";
  }, []);

  const runSimulation = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setLogs(["Parsing input JSON..."]);
    
    let parsed;
    try {
      parsed = JSON.parse(inputJson);
    } catch (e) {
      setLogs(l => [...l, "Error: Invalid JSON format."]);
      setIsRunning(false);
      return;
    }

    setLogs(l => [...l, "Initializing snarkjs..."]);
    setLogs(l => [...l, "Loading circuit: /circuits/veil_auth.wasm"]);
    setLogs(l => [...l, "Loading proving key: /circuits/veil_auth_final.zkey"]);

    try {
      const result = await generateDemoProof(
        { agentId: parsed.agentId || "unknown", sessionAmount: parsed.sessionAmount || 0 },
        (stage, ms, hex) => {
          const tail = hex ? ` -> ${hex.substring(0, 16)}...` : "";
          setLogs(l => [...l, `[${ms}ms] [${stage}]${tail}`]);
        }
      );

      setLogs(l => [
        ...l,
        `Proof generation complete in ${result.elapsedMs}ms`,
        `Local verification: ${result.verified ? "OK (groth16/bn128)" : "FAILED"}`,
        `Session root:    0x${result.commitment}`,
        `Nullifier hash:  0x${result.nullifierHash}`,
        `Public signals:  ${result.publicSignals.length} field elements`,
      ]);

      const entry = await recordAndSubmitDemoProof({
        output: result,
        page: "playground",
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
        setLogs(l => [...l, `Broadcast to devnet: ${entry.signature}`]);
      } else if (entry.status === "failed") {
        setLogs(l => [...l, `Submit failed: ${entry.error ?? "unknown"}`]);
      } else {
        setLogs(l => [...l, "Recorded locally (no wallet connected)."]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLogs(l => [...l, `Error during proof generation: ${msg}`]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-14rem)] w-full max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Proof Playground</h1>
          <p className="text-muted-foreground text-sm">Test witness generation and proving locally.</p>
        </div>
        <Button onClick={runSimulation} disabled={isRunning} className="bg-accent text-accent-foreground">
          {isRunning ? "Simulating..." : "Run Prover"}
        </Button>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        <div className="flex-1 flex flex-col gap-2">
          <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Input JSON</label>
          <Textarea 
            className="flex-1 font-mono text-sm bg-card resize-none"
            value={inputJson}
            onChange={(e) => setInputJson(e.target.value)}
            spellCheck={false}
          />
        </div>
        
        <div className="flex-1 flex flex-col gap-2">
          <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Prover Output</label>
          <div className="flex-1 bg-black border border-border rounded-md p-4 font-mono text-sm overflow-auto text-green-500/80">
            {logs.length === 0 ? (
              <span className="text-muted-foreground/50">Ready.</span>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1">{log}</div>
              ))
            )}
            {isRunning && <div className="animate-pulse">_</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Playground() {
  return (
    <WalletProviders>
      <PlaygroundInner />
    </WalletProviders>
  );
}
