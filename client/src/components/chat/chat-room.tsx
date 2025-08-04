import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { apiRequest } from "@/lib/queryClient";
import type { Message } from "@shared/schema";

interface ChatRoomProps {
  roomId: string;
  onBack: () => void;
}

export default function ChatRoom({ roomId, onBack }: ChatRoomProps) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { sendMessage, subscribe } = useWebSocket();
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/chat/rooms", roomId, "messages"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      sendMessage({
        type: "chat_message",
        roomId,
        senderId: user?.id,
        content,
        messageType: "text"
      });
    },
    onSuccess: () => {
      setMessage("");
    },
  });

  useEffect(() => {
    const unsubscribe = subscribe("new_message", (data) => {
      if (data.message.roomId === roomId) {
        queryClient.setQueryData(
          ["/api/chat/rooms", roomId, "messages"],
          (old: Message[] = []) => [...old, data.message]
        );
      }
    });

    return unsubscribe;
  }, [roomId, subscribe, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (message.trim()) {
      sendMessageMutation.mutate(message);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
        <Button variant="ghost" size="sm" onClick={onBack} className="mr-3">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-semibold">채팅</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.senderId === user?.id ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs px-3 py-2 rounded-lg ${
                msg.senderId === user?.id
                  ? "bg-primary text-white"
                  : "bg-gray-200 text-gray-900"
              }`}
            >
              <p>{msg.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {new Date(msg.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            className="flex-1"
          />
          <Button 
            onClick={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="marketplace-button-primary"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
