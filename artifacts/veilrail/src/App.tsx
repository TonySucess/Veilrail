import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "@/components/Providers";
import { Layout } from "@/components/Layout";

const Home = lazy(() => import("@/pages/Home").then((m) => ({ default: m.Home })));
const Protocol = lazy(() => import("@/pages/Protocol").then((m) => ({ default: m.Protocol })));
const Docs = lazy(() => import("@/pages/Docs").then((m) => ({ default: m.Docs })));
const Playground = lazy(() => import("@/pages/Playground").then((m) => ({ default: m.Playground })));
const Compare = lazy(() => import("@/pages/Compare").then((m) => ({ default: m.Compare })));
const Token = lazy(() => import("@/pages/Token").then((m) => ({ default: m.Token })));
const Roadmap = lazy(() => import("@/pages/Roadmap").then((m) => ({ default: m.Roadmap })));
const Dashboard = lazy(() => import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Legal = lazy(() => import("@/pages/Legal").then((m) => ({ default: m.Legal })));
const Security = lazy(() => import("@/pages/Security").then((m) => ({ default: m.Security })));
const Ceremony = lazy(() => import("@/pages/Ceremony").then((m) => ({ default: m.Ceremony })));
const LegalTerms = lazy(() => import("@/pages/LegalTerms").then((m) => ({ default: m.LegalTerms })));
const LegalPrivacy = lazy(() => import("@/pages/LegalPrivacy").then((m) => ({ default: m.LegalPrivacy })));
const NotFound = lazy(() => import("@/pages/not-found"));

function RouteFallback() {
  return (
    <div className="w-full flex items-center justify-center py-24 text-muted-foreground font-mono text-xs">
      Loading…
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Suspense fallback={<RouteFallback />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/protocol" component={Protocol} />
          <Route path="/docs" component={Docs} />
          <Route path="/docs/playground" component={Playground} />
          <Route path="/compare" component={Compare} />
          <Route path="/token" component={Token} />
          <Route path="/roadmap" component={Roadmap} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/security" component={Security} />
          <Route path="/ceremony" component={Ceremony} />
          <Route path="/legal" component={Legal} />
          <Route path="/legal/terms" component={LegalTerms} />
          <Route path="/legal/privacy" component={LegalPrivacy} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Layout>
  );
}

function App() {
  return (
    <Providers>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </Providers>
  );
}

export default App;
