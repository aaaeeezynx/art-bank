import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import ArtworkList from "./pages/ArtworkList";
import ArtworkDetail from "./pages/ArtworkDetail";
import ArtworkEntry from "./pages/ArtworkEntry";
import ArtworkEdit from "./pages/ArtworkEdit";
import ArtworkStatusList from "./pages/ArtworkStatusList";
import StorageManagement from "./pages/StorageManagement";
import Login from "./pages/Login";
import DashboardLayout from "./components/DashboardLayout";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
          <p className="text-sm text-muted-foreground font-serif tracking-widest">載入中…</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login">
        <Login />
      </Route>
      <Route path="/">
        <AuthGuard>
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        </AuthGuard>
      </Route>
      <Route path="/artworks">
        <AuthGuard>
          <DashboardLayout>
            <ArtworkList />
          </DashboardLayout>
        </AuthGuard>
      </Route>
      <Route path="/artworks/new">
        <AuthGuard>
          <DashboardLayout>
            <ArtworkEntry />
          </DashboardLayout>
        </AuthGuard>
      </Route>
      <Route path="/artworks/status/:status">
        {(params) => (
          <AuthGuard>
            <DashboardLayout>
              <ArtworkStatusList status={decodeURIComponent(params.status)} />
            </DashboardLayout>
          </AuthGuard>
        )}
      </Route>
      <Route path="/artworks/:id/edit">
        {(params) => (
          <AuthGuard>
            <DashboardLayout>
              <ArtworkEdit id={Number(params.id)} />
            </DashboardLayout>
          </AuthGuard>
        )}
      </Route>
      <Route path="/artworks/:id">
        {(params) => (
          <AuthGuard>
            <DashboardLayout>
              <ArtworkDetail id={Number(params.id)} />
            </DashboardLayout>
          </AuthGuard>
        )}
      </Route>
      <Route path="/storage">
        <AuthGuard>
          <DashboardLayout>
            <StorageManagement />
          </DashboardLayout>
        </AuthGuard>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
