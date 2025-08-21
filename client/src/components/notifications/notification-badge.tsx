import { useUnreadNotificationCount, useUnreadMessageCount } from "@/hooks/use-notifications";
import { Bell, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  type: "notifications" | "messages";
  className?: string;
}

export default function NotificationBadge({ type, className }: NotificationBadgeProps) {
  const { data: notificationCount } = useUnreadNotificationCount();
  const { data: messageCount } = useUnreadMessageCount();
  
  const count = type === "notifications" 
    ? notificationCount?.count || 0 
    : messageCount?.count || 0;
    
  const Icon = type === "notifications" ? Bell : MessageCircle;
  
  return (
    <div className={cn("relative", className)}>
      <Icon className="h-6 w-6" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </div>
  );
}