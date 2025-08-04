import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { WebSocketProvider } from "./hooks/use-websocket";

import Home from "@/pages/home";
import Chat from "@/pages/chat";
import ChatRoom from "@/pages/chat-room";
import Community from "@/pages/community";
import MyPage from "@/pages/my";
import Profile from "@/pages/profile";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import CreateItem from "@/pages/items/create";
import ItemDetail from "@/pages/items/detail";
import SearchPage from "@/pages/search";
import SearchResults from "@/pages/search-results";
import NotFound from "@/pages/not-found";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";

import BottomNav from "@/components/layout/bottom-nav";

function Router() {
  const [location] = useLocation();
  const isAuthPage = location.startsWith('/auth');
  const isItemDetailPage = location.startsWith('/items/') && location !== '/items/create';
  const isSearchPage = location === '/search' || location.startsWith('/search/');
  const isProfilePage = location === '/profile';
  const isAdminPage = location.startsWith('/admin');

  return (
    <div className={isAdminPage ? "bg-gray-50 min-h-screen" : "max-w-md mx-auto bg-white min-h-screen relative"}>
      <Switch>
        <Route path="/auth/login" component={Login} />
        <Route path="/auth/register" component={Register} />
        <Route path="/" component={Home} />
        <Route path="/search" component={SearchPage} />
        <Route path="/search/:query" component={SearchResults} />
        <Route path="/chat" component={Chat} />
        <Route path="/chat/:roomId" component={ChatRoom} />
        <Route path="/community" component={Community} />
        <Route path="/my" component={MyPage} />
        <Route path="/profile" component={Profile} />
        <Route path="/items/create" component={CreateItem} />
        <Route path="/items/:id" component={ItemDetail} />
        <Route path="/admin" component={AdminLogin} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route component={NotFound} />
      </Switch>
      
      {!isAuthPage && !isItemDetailPage && !isSearchPage && !isProfilePage && !isAdminPage && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WebSocketProvider>
            <Toaster />
            <Router />
          </WebSocketProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
