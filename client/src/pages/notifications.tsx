import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/layout/header";
import NotificationList from "@/components/notifications/notification-list";
import { useUnreadNotificationCount } from "@/hooks/use-notifications";
import { useEffect } from "react";

export default function NotificationsPage() {
  const { user } = useAuth();
  const { data: notificationCount } = useUnreadNotificationCount();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user) {
      window.location.href = "/auth/login";
    }
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="알림" 
        showSearch={false} 
        showNotifications={false}
      />
      <div className="px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              알림 {notificationCount?.count ? `(${notificationCount.count})` : ''}
            </h2>
          </div>
          <NotificationList />
        </div>
      </div>
    </div>
  );
}