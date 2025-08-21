import { useNotifications, useMarkNotificationAsRead } from "@/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Bell, MessageCircle, Settings, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Notification } from "@shared/schema";

function getNotificationIcon(type: string) {
  switch (type) {
    case "new_message":
      return <MessageCircle className="h-5 w-5 text-blue-500" />;
    case "status_change":
      return <Settings className="h-5 w-5 text-orange-500" />;
    case "new_comment":
      return <MessageCircle className="h-5 w-5 text-green-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
}

interface NotificationItemProps {
  notification: Notification;
}

function NotificationItem({ notification }: NotificationItemProps) {
  const markAsRead = useMarkNotificationAsRead();
  
  const handleMarkAsRead = () => {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }
  };
  
  const handleClick = () => {
    handleMarkAsRead();
    if (notification.link) {
      window.location.href = notification.link;
    }
  };
  
  return (
    <Card className={`cursor-pointer transition-colors ${
      notification.isRead ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
    }`}>
      <CardContent className="p-4" onClick={handleClick}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${notification.isRead ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
              {notification.content}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
                locale: ko
              })}
            </p>
          </div>
          {!notification.isRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleMarkAsRead();
              }}
              className="flex-shrink-0"
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function NotificationList() {
  const { data: notifications, isLoading, error } = useNotifications();
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">알림을 불러오는 중 오류가 발생했습니다.</p>
      </div>
    );
  }
  
  if (!notifications || notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">새로운 알림이 없습니다.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {notifications.map((notification: Notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
}