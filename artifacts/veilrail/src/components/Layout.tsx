import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

const navLinks = [
  { href: "/protocol", label: "Protocol" },
  { href: "/docs", label: "Docs" },
  { href: "/compare", label: "Compare" },
  { href: "/security", label: "Security" },
  { href: "/ceremony", label: "Trusted setup" },
  { href: "/roadmap", label: "Roadmap" },
  // $VEIL nav entry hidden until launch — restore by uncommenting:
  // { href: "/token", label: "$VEIL" },
];

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="container max-w-7xl flex h-14 items-center justify-between mx-auto px-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <img src="/veilrail-logo.jpg" alt="VeilRail" className="w-6 h-6 rounded" />
              <span className="font-semibold tracking-tight text-sm">VeilRail</span>
            </Link>
            <nav className="hidden md:flex gap-6 text-sm text-muted-foreground">
              {navLinks.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`transition-colors hover:text-foreground ${location.startsWith(l.href) ? "text-foreground" : ""}`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden md:inline-flex text-sm text-accent hover:text-accent/80 transition-colors"
            >
              Dash
            </Link>
            <a
              href="https://github.com/TonySucess/veilrail"
              target="_blank"
              rel="noreferrer"
              aria-label="VeilRail on GitHub"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
            </a>
            <a
              href="https://x.com/veilrailx402"
              target="_blank"
              rel="noreferrer"
              aria-label="VeilRail on X"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.26 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen(o => !o)}
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md border border-border text-muted-foreground hover:text-foreground"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {open ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-border bg-background">
            <nav className="container max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1 text-sm">
              {navLinks.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`px-3 py-2 rounded-md hover:bg-muted ${location.startsWith(l.href) ? "text-foreground bg-muted" : "text-muted-foreground"}`}
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/dashboard"
                className="px-3 py-2 rounded-md text-accent hover:bg-muted mt-2 border-t border-border pt-4"
              >
                Dash
              </Link>
              {/* $VEIL mobile menu entry hidden until launch — restore by uncommenting:
              <Link href="/token" className="px-3 py-2 rounded-md text-muted-foreground hover:bg-muted">$VEIL</Link>
              */}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-border py-12 mt-20">
        <div className="container max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          <div className="flex flex-col gap-3">
            <span className="font-semibold">Protocol</span>
            <Link href="/protocol" className="text-muted-foreground hover:text-foreground">Architecture</Link>
            <Link href="/compare" className="text-muted-foreground hover:text-foreground">Leak comparison</Link>
            <Link href="/security" className="text-muted-foreground hover:text-foreground">Security</Link>
            <Link href="/ceremony" className="text-muted-foreground hover:text-foreground">Trusted setup</Link>
            <Link href="/roadmap" className="text-muted-foreground hover:text-foreground">Roadmap</Link>
          </div>
          <div className="flex flex-col gap-3">
            <span className="font-semibold">Developers</span>
            <Link href="/docs" className="text-muted-foreground hover:text-foreground">Documentation</Link>
            <Link href="/docs/playground" className="text-muted-foreground hover:text-foreground">Playground</Link>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">Dash</Link>
          </div>
          <div className="flex flex-col gap-3">
            <span className="font-semibold">Community</span>
            <a href="https://github.com/TonySucess/veilrail" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
              GitHub
            </a>
            <a href="https://x.com/veilrailx402" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.26 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Twitter
            </a>
            <a href="https://github.com/TonySucess/veilrail/issues" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">Report issue</a>
            {/* $VEIL footer link hidden until launch — restore by uncommenting:
            <Link href="/token" className="text-muted-foreground hover:text-foreground">$VEIL</Link>
            */}
          </div>
          <div className="flex flex-col gap-3">
            <span className="font-semibold">Legal</span>
            <Link href="/legal/terms" className="text-muted-foreground hover:text-foreground">Terms</Link>
            <Link href="/legal/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link>
          </div>
        </div>
        <div className="container max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center text-xs text-muted-foreground gap-3">
          <span>&copy; {new Date().getFullYear()} VeilRail. Built on Solana.</span>
          <span className="font-mono">veil-devnet-0.1.0</span>
        </div>
      </footer>
    </div>
  );
}
