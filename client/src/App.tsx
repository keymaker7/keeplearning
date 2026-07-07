import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import DailyRecordPage from "@/pages/daily-record";
import PortfolioPage from "@/pages/portfolio";
import TeacherDashboard from "@/pages/teacher-dashboard";
import StudentDetail from "@/pages/student-detail";

// Fix typing for AuthPage
const AuthPageWrapper = () => <AuthPage />;
const NotFoundWrapper = () => <NotFound />;

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/daily-record" component={DailyRecordPage} />
      <ProtectedRoute path="/portfolio/:studentId" component={PortfolioPage} />
      <ProtectedRoute path="/dashboard" component={TeacherDashboard} />
      <ProtectedRoute path="/dashboard/:studentId" component={StudentDetail} />
      <Route path="/auth" component={AuthPageWrapper} />
      <Route component={NotFoundWrapper} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
