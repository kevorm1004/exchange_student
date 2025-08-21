import { Home, MessageCircle, Users, User } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useUnreadMessageCount } from "@/hooks/use-notifications";

export default function BottomNav() {
  const [location, navigate] = useLocation();
  const { data: messageCount } = useUnreadMessageCount();

  const navItems = [
    { path: "/", icon: Home, label: "홈" },
    { path: "/chat", icon: MessageCircle, label: "채팅", badge: messageCount?.count || 0 },
    { path: "/community", icon: Users, label: "커뮤니티" },
    { path: "/my", icon: User, label: "MY" },
  ];

  return (
    <nav className="marketplace-bottom-nav">
      <div className="max-w-md mx-auto px-4 py-2">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "marketplace-nav-item",
                  isActive && "active"
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5 mb-1" />
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
