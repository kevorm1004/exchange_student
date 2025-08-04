import { Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">Beta</span>
        </div>
        <div className="flex items-center space-x-4">
          {showSearch && (
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-primary">
              <Search className="h-5 w-5" />
            </Button>
          )}
          {showNotifications && (
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-primary relative">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
