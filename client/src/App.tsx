import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";

import Home from "@/pages/home";
import Chat from "@/pages/chat";
import Community from "@/pages/community";
import Profile from "@/pages/profile";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import CreateItem from "@/pages/items/create";
import ItemDetail from "@/pages/items/detail";
import NotFound from "@/pages/not-found";

import BottomNav from "@/components/layout/bottom-nav";

function Router() {
  const [location] = useLocation();
  const isAuthPage = location.startsWith('/auth');

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen relative">
      <Switch>
        <Route path="/auth/login" component={Login} />
        <Route path="/auth/register" component={Register} />
        <Route path="/" component={Home} />
        <Route path="/chat" component={Chat} />
        <Route path="/community" component={Community} />
        <Route path="/profile" component={Profile} />
        <Route path="/items/create" component={CreateItem} />
        <Route path="/items/:id" component={ItemDetail} />
        <Route component={NotFound} />
      </Switch>
      
      {!isAuthPage && <BottomNav />}
    </div>
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
