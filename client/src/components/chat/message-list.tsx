import { MessageCircle, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Message } from "@shared/schema";

interface MessageListProps {
  messages: Message[];
  onMessageClick: (roomId: string) => void;
}

export default function MessageList({ messages, onMessageClick }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-2">아직 메시지가 없습니다</p>
        <p className="text-sm text-gray-400">관심 있는 상품의 판매자와 채팅을 시작해보세요</p>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-3">
      {messages.map((message) => (
        <Card 
          key={message.id} 
          className="p-4 cursor-pointer hover:bg-gray-50"
          onClick={() => onMessageClick(message.roomId)}
        >
          <div className="flex items-center space-x-3">
            <div className="bg-gray-200 rounded-full p-2">
              <User className="h-6 w-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">채팅방 #{message.roomId.slice(0, 8)}</h3>
              <p className="text-sm text-gray-500 truncate">{message.content}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(message.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
