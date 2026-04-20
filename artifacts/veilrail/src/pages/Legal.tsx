import { useEffect } from "react";

export function Legal() {
  useEffect(() => {
    document.title = "Legal — VeilRail";
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">
      <div className="md:col-span-1 border-r border-border min-h-[50vh]">
        <ul className="space-y-4 sticky top-24 font-mono text-sm">
          <li><a href="#terms" className="text-muted-foreground hover:text-foreground">Terms of Service</a></li>
          <li><a href="#privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</a></li>
          <li><a href="#disclosures" className="text-muted-foreground hover:text-foreground">Disclosures</a></li>
        </ul>
      </div>
      
      <div className="md:col-span-2 space-y-16">
        <section id="terms">
          <h2 className="text-2xl font-semibold mb-6">Terms of Service</h2>
          <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
            <p>
              These Terms govern your use of the VeilRail protocol interfaces and developer tools. The protocol itself consists of open source smart contracts deployed on the Solana blockchain. We do not control the blockchain, nor do we custody user funds.
            </p>
            <p>
              By utilizing the open source software, you acknowledge that you are interacting with experimental cryptographic systems.
            </p>
          </div>
        </section>

        <section id="privacy">
          <h2 className="text-2xl font-semibold mb-6">Privacy Policy</h2>
          <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
            <p>
              This website does not track IP addresses, set tracking cookies, or collect analytics data. The zero knowledge proofs generated in the playground and dashboard are constructed entirely in the client. We do not receive or log your private inputs.
            </p>
          </div>
        </section>

        <section id="disclosures">
          <h2 className="text-2xl font-semibold mb-6">Disclosures</h2>
          <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
            <p>
              <strong>No investment advice.</strong> Nothing on this site constitutes financial advice. 
            </p>
            <p>
              <strong>No token offering.</strong> We are not conducting a token sale. Do not send funds to anyone claiming to represent VeilRail.
            </p>
            <p>
              <strong>Devnet software.</strong> The current iteration of the protocol is deployed exclusively to the Solana devnet. It has not been fully audited. Use at your own risk.
            </p>
            <p>
              <strong>No warranties.</strong> The software is provided "as is", without warranty of any kind, express or implied.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
