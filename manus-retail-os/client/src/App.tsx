import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";

// Pages
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import Orders from "./pages/Orders";
import TillSessions from "./pages/TillSessions";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Loyalty from "./pages/Loyalty";
import WhatsApp from "./pages/WhatsApp";
import Staff from "./pages/Staff";
import Devices from "./pages/Devices";
import Stores from "./pages/Stores";
import Analytics from "./pages/Analytics";
import SettingsPage from "./pages/Settings";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/products" component={Products} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/orders" component={Orders} />
        <Route path="/till" component={TillSessions} />
        <Route path="/customers" component={Customers} />
        <Route path="/customers/:id" component={CustomerDetail} />
        <Route path="/loyalty" component={Loyalty} />
        <Route path="/whatsapp" component={WhatsApp} />
        <Route path="/staff" component={Staff} />
        <Route path="/devices" component={Devices} />
        <Route path="/stores" component={Stores} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
