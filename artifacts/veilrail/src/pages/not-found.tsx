import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex flex-1 w-full items-center justify-center px-4 py-24">
      <div className="w-full max-w-md text-center">
        <div className="font-mono text-xs text-muted-foreground tracking-wider mb-4">404</div>
        <h1 className="text-3xl font-semibold mb-3">Route not found</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          The page you tried to reach is not part of the protocol. Head back to the index or
          jump straight into the docs.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center bg-accent text-accent-foreground px-4 py-2 rounded-md font-medium hover:bg-accent/90 transition-colors"
          >
            Home
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center justify-center border border-border px-4 py-2 rounded-md hover:bg-muted transition-colors"
          >
            Read the docs
          </Link>
        </div>
      </div>
    </div>
  );
}
