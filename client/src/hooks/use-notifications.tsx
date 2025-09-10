import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";

export function useNotifications() {
  return useQuery({
    queryKey: ["/api/notifications"],
    refetchInterval: 60000, // 1분으로 늘려서 서버 부하 줄이기
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000, // 30초로 늘려서 서버 부하 줄이기
    staleTime: 30000 // 캐시 시간 추가
  });
}

export function useUnreadMessageCount() {
  return useQuery({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 30000, // 30초로 늘려서 서버 부하 줄이기
    staleTime: 30000 // 캐시 시간 추가
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      await apiRequest(`/api/notifications/${notificationId}/read`, {
        method: "PUT"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    }
  });
}