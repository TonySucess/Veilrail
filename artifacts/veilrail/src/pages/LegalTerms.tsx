import { useEffect } from "react";
import { Link } from "wouter";

export function LegalTerms() {
  useEffect(() => {
    document.title = "Terms — VeilRail";
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-16">
      <nav className="text-sm font-mono text-muted-foreground mb-8">
        <Link href="/legal/terms" className="text-foreground">Terms</Link>
        <span className="mx-3">/</span>
        <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
      </nav>
      <h1 className="text-3xl font-semibold mb-8">Terms of Service</h1>
      <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
        <p>
          These Terms govern your use of the VeilRail protocol interfaces and developer tools. The protocol itself consists of open source smart contracts deployed on the Solana blockchain. We do not control the blockchain, nor do we custody user funds.
        </p>
        <p>
          By utilizing the open source software, you acknowledge that you are interacting with experimental cryptographic systems.
        </p>
        <p>
          <strong className="text-foreground">No investment advice.</strong> Nothing on this site constitutes financial advice.
        </p>
        <p>
          <strong className="text-foreground">No token offering.</strong> We are not conducting a token sale. Do not send funds to anyone claiming to represent VeilRail.
        </p>
        <p>
          <strong className="text-foreground">Devnet software.</strong> The current iteration of the protocol is deployed exclusively to the Solana devnet. It has not been fully audited. Use at your own risk.
        </p>
        <p>
          <strong className="text-foreground">No warranties.</strong> The software is provided "as is", without warranty of any kind, express or implied.
        </p>
      </div>
    </div>
  );
}
