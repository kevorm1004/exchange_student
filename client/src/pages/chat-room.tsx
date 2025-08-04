import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, Plus, MoreVertical, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRequireAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import moment from "moment-timezone";
import type { Message, ChatRoom, User, Item } from "@shared/schema";
import { Link } from "wouter";

interface ChatRoomWithDetails extends ChatRoom {
  item: Item;
  buyer: User;
  seller: User;
}

export default function ChatRoomPage() {
  const { user } = useRequireAuth();
  const [match, params] = useRoute("/chat/:roomId");
  const roomId = params?.roomId;
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: chatRoom } = useQuery<ChatRoomWithDetails>({
    queryKey: ["/api/chat/rooms", roomId],
    enabled: !!roomId,
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/chat/rooms", roomId, "messages"],
    enabled: !!roomId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/chat/rooms/${roomId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: (newMessage) => {
      // WebSocket으로 실시간 업데이트되므로 즉시 쿼리 무효화하지 않음
      setMessage("");
      
      // 낙관적 업데이트로 메시지를 즉시 표시
      queryClient.setQueryData(
        ["/api/chat/rooms", roomId, "messages"],
        (oldMessages: Message[] = []) => {
          // 이미 있는 메시지인지 확인
          const exists = oldMessages.some(msg => msg.id === newMessage.id);
          if (exists) return oldMessages;
          return [...oldMessages, newMessage];
        }
      );
    },
    onError: () => {
      toast({
        title: "오류",
        description: "메시지 전송에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // WebSocket for real-time messages
  const { socket } = useWebSocket();

  useEffect(() => {
    if (socket && roomId && socket.readyState === WebSocket.OPEN) {
      // Join room
      socket.send(JSON.stringify({ 
        type: "join_room", 
        roomId 
      }));

      const handleMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "new_message") {
            queryClient.setQueryData(
              ["/api/chat/rooms", roomId, "messages"],
              (oldMessages: Message[] = []) => {
                // 중복 메시지 방지
                const exists = oldMessages.some(msg => msg.id === data.message.id);
                if (exists) return oldMessages;
                return [...oldMessages, data.message];
              }
            );
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      socket.addEventListener("message", handleMessage);

      return () => {
        socket.removeEventListener("message", handleMessage);
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ 
            type: "leave_room", 
            roomId 
          }));
        }
      };
    }
  }, [socket, roomId, queryClient]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(message.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!match || !roomId) {
    return <div>채팅방을 찾을 수 없습니다.</div>;
  }

  if (!chatRoom || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 상대방 정보 가져오기
  const otherUser = chatRoom.buyerId === user.id ? chatRoom.seller : chatRoom.buyer;
  const otherUserCountry = otherUser.country;

  // 국가별 시간대 매핑
  const getTimezoneByCountry = (country: string) => {
    const timezoneMap: Record<string, string> = {
      'Japan': 'Asia/Tokyo',
      'Korea': 'Asia/Seoul',
      'China': 'Asia/Shanghai',
      'USA': 'America/New_York',
      'UK': 'Europe/London',
      'Germany': 'Europe/Berlin',
      'France': 'Europe/Paris',
      'Australia': 'Australia/Sydney',
      'Canada': 'America/Toronto',
      'Singapore': 'Asia/Singapore',
      'Hong Kong': 'Asia/Hong_Kong',
      'Taiwan': 'Asia/Taipei',
      'Thailand': 'Asia/Bangkok',
      'Vietnam': 'Asia/Ho_Chi_Minh',
      'Philippines': 'Asia/Manila',
      'Malaysia': 'Asia/Kuala_Lumpur',
      'Indonesia': 'Asia/Jakarta',
      'India': 'Asia/Kolkata',
      'Dubai': 'Asia/Dubai',
      'Turkey': 'Europe/Istanbul',
      'Russia': 'Europe/Moscow',
      'Brazil': 'America/Sao_Paulo',
      'Mexico': 'America/Mexico_City',
      'Argentina': 'America/Buenos_Aires',
      'Chile': 'America/Santiago',
      'South Africa': 'Africa/Johannesburg',
      'Egypt': 'Africa/Cairo',
      'Italy': 'Europe/Rome',
      'Spain': 'Europe/Madrid',
      'Netherlands': 'Europe/Amsterdam',
      'Sweden': 'Europe/Stockholm',
      'Norway': 'Europe/Oslo',
      'Denmark': 'Europe/Copenhagen',
      'Finland': 'Europe/Helsinki',
      'Poland': 'Europe/Warsaw',
      'Czech Republic': 'Europe/Prague',
      'Austria': 'Europe/Vienna',
      'Switzerland': 'Europe/Zurich',
      'Belgium': 'Europe/Brussels',
      'Portugal': 'Europe/Lisbon',
      'Greece': 'Europe/Athens',
      'Israel': 'Asia/Jerusalem',
      'New Zealand': 'Pacific/Auckland',
    };
    
    return timezoneMap[country] || 'UTC';
  };

  const otherUserTimezone = getTimezoneByCountry(otherUserCountry);
  const otherUserTime = moment().tz(otherUserTimezone);

  const formatMessageTime = (createdAt: string | Date) => {
    return moment(createdAt).format("오후 h:mm");
  };

  const formatDateGroup = (createdAt: string | Date) => {
    const messageDate = moment(createdAt);
    const today = moment();
    const yesterday = moment().subtract(1, 'day');

    if (messageDate.isSame(today, 'day')) {
      return null; // 오늘은 표시하지 않음
    } else if (messageDate.isSame(yesterday, 'day')) {
      return "어제";
    } else {
      return messageDate.format("YYYY년 M월 D일");
    }
  };

  // 메시지를 날짜별로 그룹화
  const groupedMessages = messages.reduce((groups: Array<{ date: string | null; messages: Message[] }>, message) => {
    const dateGroup = formatDateGroup(message.createdAt);
    const lastGroup = groups[groups.length - 1];
    
    if (lastGroup && lastGroup.date === dateGroup) {
      lastGroup.messages.push(message);
    } else {
      groups.push({ date: dateGroup, messages: [message] });
    }
    
    return groups;
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <Link href="/chat">
            <Button variant="ghost" size="sm" className="p-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-medium text-gray-900">{otherUser.fullName}</h1>
          </div>
        </div>
        
        <Button variant="ghost" size="sm" className="p-1">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      {/* 상대방 시간 표시 */}
      <div className="flex flex-col items-center py-4 bg-gray-50">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-200 rounded-full mb-2">
          <Clock className="h-6 w-6 text-gray-600" />
        </div>
        <p className="text-sm text-gray-600 mb-1">현재 {otherUserCountry} 시간이에요</p>
        <p className="text-lg font-semibold text-gray-900">
          {otherUserTime.format("A h:mm")}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 pb-20">
        {groupedMessages.map((group, groupIndex) => (
          <div key={groupIndex}>
            {/* 날짜 구분선 */}
            {group.date && (
              <div className="flex items-center justify-center my-4">
                <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                  {group.date}
                </div>
              </div>
            )}
            
            {/* 메시지들 */}
            {group.messages.map((msg) => {
              const isMe = msg.senderId === user.id;
              return (
                <div
                  key={msg.id}
                  className={`flex mb-3 ${isMe ? "justify-end" : "justify-start"}`}
                >
                  {!isMe && (
                    <Avatar className="w-8 h-8 mt-1 mr-2">
                      <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                        {otherUser.fullName[0]}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-xs px-3 py-2 rounded-2xl ${
                        isMe
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-900"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-gray-400">
                        {formatMessageTime(msg.createdAt)}
                      </span>
                      {isMe && (
                        <span className="text-xs text-gray-400">읽음</span>
                      )}
                    </div>
                  </div>
                  
                  {isMe && (
                    <Avatar className="w-8 h-8 mt-1 ml-2">
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                        {user.fullName[0]}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - Fixed positioning */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t bg-white shadow-lg z-50">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" className="p-2 shrink-0">
            <Plus className="h-5 w-5 text-gray-600" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="메시지를 입력하세요"
              className="w-full rounded-full border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
              disabled={sendMessageMutation.isPending}
            />
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending}
            size="sm"
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}