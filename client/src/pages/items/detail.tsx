import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart, MessageCircle, Share, Eye, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import type { Item } from "@shared/schema";

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const { data: item, isLoading } = useQuery<Item>({
    queryKey: ["/api/items", id],
    enabled: !!id,
  });

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "방금 전";
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}일 전`;
    return `${Math.floor(diffInHours / 168)}주 전`;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      "전자기기": "bg-blue-100 text-blue-800",
      "도서": "bg-green-100 text-green-800",
      "가구": "bg-purple-100 text-purple-800",
      "가전": "bg-orange-100 text-orange-800",
      "운동/레저": "bg-indigo-100 text-indigo-800",
    };
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const handleChatStart = () => {
    if (!user) {
      navigate("/auth/login");
      return;
    }
    // TODO: Create chat room and navigate to it
    navigate("/chat");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">상품을 찾을 수 없습니다.</p>
        <Button onClick={() => navigate("/")} className="mt-4">
          홈으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-gray-600"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            뒤로
          </Button>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => {
                // TODO: Toggle favorite functionality
                console.log('Toggle favorite');
              }}
            >
              <Heart className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
              onClick={handleChatStart}
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="pb-20">
        {/* Image Gallery */}
        <div className="relative bg-black">
          <img
            src={item.images[0] || "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"}
            alt={item.title}
            className="w-full h-80 object-cover"
          />
          {item.images.length > 1 && (
            <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white text-sm px-2 py-1 rounded-full">
              1 / {item.images.length}
            </div>
          )}
        </div>

        <div className="px-4 pt-4 space-y-4">
          {/* Item Info */}
          <Card className="p-4">
            <div className="flex justify-between items-start mb-3">
              <Badge className={getCategoryColor(item.category)}>{item.category}</Badge>
              <div className="flex items-center text-gray-500 text-sm space-x-3">
                <span className="flex items-center">
                  <Eye className="w-4 h-4 mr-1" />
                  {item.views}
                </span>
                <span className="flex items-center">
                  <Heart className="w-4 h-4 mr-1" />
                  {item.likes}
                </span>
              </div>
            </div>
            
            <h1 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h1>
            <p className="text-3xl font-bold text-primary mb-3">${item.price}</p>
            
            <div className="flex items-center text-gray-600 text-sm mb-4">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{item.location}</span>
              <span className="mx-2">•</span>
              <span>{formatTimeAgo(new Date(item.createdAt))}</span>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">상품 설명</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{item.description}</p>
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">상품 상태</span>
                  <p className="font-medium">{item.condition}</p>
                </div>
                <div>
                  <span className="text-gray-500">거래 방식</span>
                  <p className="font-medium">직거래</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Seller Info */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">판매자 정보</h3>
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">판매자</p>
                <p className="text-sm text-gray-600">{item.school}</p>
              </div>
            </div>
          </Card>
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-md mx-auto flex space-x-3">
          <Button 
            variant="outline" 
            size="lg"
            className="flex-1 h-12"
            onClick={() => {
              // TODO: Toggle favorite functionality
              console.log('Toggle favorite');
            }}
          >
            <Heart className="w-5 h-5 mr-2" />
            찜하기
          </Button>
          <Button 
            size="lg"
            className="flex-1 h-12 marketplace-button-primary"
            onClick={handleChatStart}
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            채팅하기
          </Button>
        </div>
      </div>
    </div>
  );
}
