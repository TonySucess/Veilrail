import { useEffect } from "react";
import { Link } from "wouter";

export function LegalPrivacy() {
  useEffect(() => {
    document.title = "Privacy — VeilRail";
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-16">
      <nav className="text-sm font-mono text-muted-foreground mb-8">
        <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
        <span className="mx-3">/</span>
        <Link href="/legal/privacy" className="text-foreground">Privacy</Link>
      </nav>
      <h1 className="text-3xl font-semibold mb-8">Privacy Policy</h1>
      <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
        <p>
          This website does not track IP addresses, set tracking cookies, or collect analytics data.
        </p>
        <p>
          The zero knowledge proofs generated in the playground and dashboard are constructed entirely in the client. We do not receive or log your private inputs.
        </p>
        <p>
          The only network requests this site makes are to public Solana RPC endpoints for the purposes of reading onchain state. Those requests do not carry personally identifying data.
        </p>
        <p>
          Wallet adapters communicate with the wallet extensions you install. We do not store, transmit, or have access to your wallet seed phrase under any circumstances.
        </p>
      </div>
    </div>
  );
}
