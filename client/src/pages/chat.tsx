import { useQuery } from "@tanstack/react-query";
import { MessageCircle, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useRequireAuth } from "@/hooks/use-auth";
import Header from "@/components/layout/header";
import type { ChatRoom } from "@shared/schema";

export default function Chat() {
  const { user, isLoading: authLoading } = useRequireAuth();

  const { data: chatRooms = [], isLoading } = useQuery<ChatRoom[]>({
    queryKey: ["/api/chat/rooms"],
    enabled: !!user,
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Header title="채팅" showSearch={false} />
      
      <main className="pb-20 pt-4">
        {chatRooms.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">아직 채팅방이 없습니다</p>
            <p className="text-sm text-gray-400">관심 있는 상품의 판매자와 채팅을 시작해보세요</p>
          </div>
        ) : (
          <div className="px-4 space-y-3">
            {chatRooms.map((room) => (
              <Card key={room.id} className="p-4 cursor-pointer hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="bg-gray-200 rounded-full p-2">
                    <User className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">채팅방 #{room.id.slice(0, 8)}</h3>
                    <p className="text-sm text-gray-500">상품 관련 채팅</p>
                  </div>
                  <div className="text-right">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
