import { Home, MessageCircle, Users, User } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

export default function BottomNav() {
  const [location, navigate] = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "홈" },
    { path: "/chat", icon: MessageCircle, label: "채팅", badge: 2 },
    { path: "/community", icon: Users, label: "커뮤니티" },
    { path: "/profile", icon: User, label: "MY" },
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
                  {item.badge && (
                    <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {item.badge}
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
