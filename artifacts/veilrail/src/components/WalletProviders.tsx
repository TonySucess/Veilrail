import { ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

function resolveDevnetEndpoint(): string {
  const override = import.meta.env.VITE_SOLANA_RPC_URL as string | undefined;
  if (override && override.length > 0) return override;
  if (import.meta.env.DEV && typeof window !== "undefined") {
    const base = import.meta.env.BASE_URL.endsWith("/")
      ? import.meta.env.BASE_URL.slice(0, -1)
      : import.meta.env.BASE_URL;
    return `${window.location.origin}${base}/devnet-rpc`;
  }
  return clusterApiUrl("devnet");
}

export function WalletProviders({ children }: { children: ReactNode }) {
  const endpoint = useMemo(resolveDevnetEndpoint, []);
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default WalletProviders;
