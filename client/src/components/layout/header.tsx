import { Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useUnreadNotificationCount } from "@/hooks/use-notifications";

interface HeaderProps {
  title: string;
  showSearch?: boolean;
  showNotifications?: boolean;
  notificationCount?: number;
}

export default function Header({ 
  title, 
  showSearch = true, 
  showNotifications = true,
  notificationCount = 0 
}: HeaderProps) {
  const [, navigate] = useLocation();
  const { data: liveNotificationCount } = useUnreadNotificationCount();
  
  // Use live notification count if no explicit count is provided
  const displayCount = notificationCount || liveNotificationCount?.count || 0;

  const handleSearchClick = () => {
    navigate("/search");
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50 h-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        </div>
        <div className="flex items-center space-x-4">
          {showSearch && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-600 hover:text-primary"
              onClick={handleSearchClick}
            >
              <Search className="h-5 w-5" />
            </Button>
          )}
          {showNotifications && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-600 hover:text-primary relative"
              onClick={() => navigate("/notifications")}
            >
              <Bell className="h-5 w-5" />
              {displayCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {displayCount > 99 ? "99+" : displayCount}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
