import { useQuery } from "@tanstack/react-query";
import { MessageCircle, User, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRequireAuth } from "@/hooks/use-auth";
import Header from "@/components/layout/header";
import { Link } from "wouter";
import moment from "moment-timezone";
import type { ChatRoom, User as UserType, Item } from "@shared/schema";

interface ChatRoomWithDetails extends ChatRoom {
  item: Item;
  buyer: UserType;
  seller: UserType;
}

export default function Chat() {
  const { user, isLoading: authLoading } = useRequireAuth();

  const { data: chatRooms = [], isLoading } = useQuery<ChatRoomWithDetails[]>({
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

  const formatLastMessageTime = (createdAt: string | Date) => {
    const messageTime = moment(createdAt);
    const now = moment();
    
    if (messageTime.isSame(now, 'day')) {
      return messageTime.format('오후 h:mm');
    } else if (messageTime.isSame(now.subtract(1, 'day'), 'day')) {
      return '어제';
    } else {
      return messageTime.format('M월 D일');
    }
  };

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
          <div className="px-4 space-y-1">
            {chatRooms.map((room) => {
              // 상대방 정보 가져오기
              const otherUser = room.buyerId === user?.id ? room.seller : room.buyer;
              
              return (
                <Link key={room.id} href={`/chat/${room.id}`}>
                  <Card className="p-4 cursor-pointer hover:bg-gray-50 transition-colors border-0 shadow-none border-b border-gray-100 last:border-0">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={otherUser.profileImage || undefined} />
                        <AvatarFallback className="bg-gray-200 text-gray-600">
                          {otherUser.fullName[0]}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-gray-900 truncate">
                            {otherUser.fullName}
                          </h3>
                          <span className="text-xs text-gray-400">
                            {formatLastMessageTime(room.createdAt)}
                          </span>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-500">
                          <span className="truncate flex-1">
                            {room.item.title}
                          </span>
                          <div className="flex items-center gap-1 ml-2 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>{otherUser.country}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
