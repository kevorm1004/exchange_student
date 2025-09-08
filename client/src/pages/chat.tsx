import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, User, Clock, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRequireAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState, useRef } from "react";
import Header from "@/components/layout/header";
import { Link } from "wouter";
import moment from "moment-timezone";
import type { ChatRoom, User as UserType, Item, Message } from "@shared/schema";

interface ChatRoomWithDetails extends ChatRoom {
  item: Item;
  buyer: UserType;
  seller: UserType;
  unreadCount: number;
  latestMessage?: Message | null;
}

export default function Chat() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // 스와이프 관련 상태
  const [swipedRoomId, setSwipedRoomId] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchCurrentX = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);

  const { data: chatRooms = [], isLoading } = useQuery<ChatRoomWithDetails[]>({
    queryKey: ["/api/chat/rooms"],
    queryFn: async () => {
      const response = await fetch("/api/chat/rooms", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch chat rooms");
      return response.json();
    },
    enabled: !!user,
  });

  // 채팅방 삭제 mutation
  const deleteChatRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      return apiRequest(`/api/chat/rooms/${roomId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      toast({
        title: "채팅방 삭제 완료",
        description: "채팅방이 삭제되었습니다.",
      });
      setSwipedRoomId(null);
      setDragOffset(0);
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "채팅방 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // 스와이프 관련 핸들러
  const handleTouchStart = (e: React.TouchEvent, roomId: string) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    setSwipedRoomId(roomId);
  };

  const handleTouchMove = (e: React.TouchEvent, roomId: string) => {
    if (touchStartX.current === null || swipedRoomId !== roomId) return;
    
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchStartX.current - touchCurrentX.current;
    
    // 좌측으로 스와이프할 때만 처리 (diff > 0)
    if (diff > 0 && diff <= 100) {
      setDragOffset(diff);
    }
  };

  const handleTouchEnd = (roomId: string) => {
    if (touchStartX.current === null || touchCurrentX.current === null || swipedRoomId !== roomId) {
      resetSwipe();
      return;
    }
    
    const diff = touchStartX.current - touchCurrentX.current;
    
    // 50px 이상 스와이프했으면 버튼 표시, 아니면 원상복귀
    if (diff >= 50) {
      setDragOffset(80); // 버튼이 완전히 보이도록
    } else {
      resetSwipe();
    }
    
    touchStartX.current = null;
    touchCurrentX.current = null;
  };

  const resetSwipe = () => {
    setSwipedRoomId(null);
    setDragOffset(0);
  };

  const handleDeleteRoom = (roomId: string) => {
    deleteChatRoomMutation.mutate(roomId);
  };

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
              const isSwipedRoom = swipedRoomId === room.id;
              
              return (
                <div key={room.id} className="relative overflow-hidden">
                  {/* 삭제 버튼 (뒤에 숨겨져 있음) */}
                  <div className="absolute right-0 top-0 h-full w-20 bg-red-500 flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteRoom(room.id);
                      }}
                      className="w-full h-full flex flex-col items-center justify-center text-white"
                      disabled={deleteChatRoomMutation.isPending}
                    >
                      <Trash2 className="h-5 w-5 mb-1" />
                      <span className="text-xs">나가기</span>
                    </button>
                  </div>
                  
                  {/* 메인 채팅방 아이템 */}
                  <div
                    className="relative z-10 bg-white"
                    style={{
                      transform: `translateX(-${isSwipedRoom ? dragOffset : 0}px)`,
                      transition: touchStartX.current === null ? 'transform 0.3s ease' : 'none'
                    }}
                    onTouchStart={(e) => handleTouchStart(e, room.id)}
                    onTouchMove={(e) => handleTouchMove(e, room.id)}
                    onTouchEnd={() => handleTouchEnd(room.id)}
                    onClick={() => {
                      if (isSwipedRoom && dragOffset > 0) {
                        resetSwipe();
                      }
                    }}
                  >
                    <Link href={`/chat/${room.id}`}>
                      <Card className="p-4 cursor-pointer hover:bg-gray-50 transition-colors border-0 shadow-none border-b border-gray-100 last:border-0">
                        <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={otherUser?.profileImage || undefined} />
                          <AvatarFallback className="bg-gray-200 text-gray-600">
                            {otherUser?.fullName?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* 상품 대표 이미지 */}
                        {room.item.images && room.item.images.length > 0 && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white bg-white overflow-hidden">
                            <img 
                              src={room.item.images[0]} 
                              alt={room.item.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-gray-900 truncate">
                            {otherUser.fullName}
                          </h3>
                          <span className="text-xs text-gray-400">
                            {room.latestMessage ? formatLastMessageTime(room.latestMessage.createdAt) : formatLastMessageTime(room.createdAt)}
                          </span>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-500">
                          <span className="truncate flex-1">
                            {room.latestMessage && room.latestMessage.content ? room.latestMessage.content : "아직 메시지가 없습니다"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        {room.unreadCount > 0 && (
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-medium">
                              {room.unreadCount > 99 ? "99+" : room.unreadCount}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                      </Card>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
