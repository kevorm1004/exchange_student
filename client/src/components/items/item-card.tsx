import { Heart, Eye, Camera, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import type { Item } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ItemCardProps {
  item: Item;
  isFavorite?: boolean;
  onToggleFavorite?: (itemId: string) => void;
  variant?: "default" | "grid"; // grid variant for search results
}

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

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return "방금 전";
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}일 전`;
  return `${Math.floor(diffInHours / 168)}주 전`;
};

const calculateDistance = (userSchool: string, itemSchool: string) => {
  // TODO: 실제로는 지리적 거리 계산 API를 사용해야 합니다
  // 지금은 간단한 더미 데이터로 처리
  if (userSchool === itemSchool) return "0km";
  
  const distances: { [key: string]: string } = {
    "Seoul National University": "2.5km",
    "Yonsei University": "3.2km", 
    "Korea University": "4.1km",
    "Ewha Womans University": "1.8km",
    "Hongik University": "5.3km"
  };
  
  return distances[itemSchool] || "7.2km";
};

export default function ItemCard({ item, isFavorite = false, onToggleFavorite, variant = "default" }: ItemCardProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const handleCardClick = () => {
    navigate(`/items/${item.id}`);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(item.id);
  };

  const distance = user ? calculateDistance(user.school, item.school) : "알 수 없음";

  // Grid variant for search results
  if (variant === "grid") {
    return (
      <Card className="marketplace-card cursor-pointer hover:shadow-md transition-shadow" onClick={handleCardClick}>
        <div className="p-3">
          {/* 상단 이미지 */}
          <div className="relative mb-3">
            <img
              src={item.images[0] || "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200"}
              alt={item.title}
              className="w-full h-32 object-cover rounded-lg"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 text-gray-600 hover:text-red-500 p-1 bg-white rounded-full shadow-sm"
              onClick={handleFavoriteClick}
            >
              <Heart 
                className={cn(
                  "h-4 w-4",
                  isFavorite ? "fill-red-500 text-red-500" : "fill-none"
                )} 
              />
            </Button>
          </div>

          {/* 하단 정보 */}
          <div>
            {/* 제목 */}
            <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">{item.title}</h3>
            
            {/* 가격 */}
            <p className="text-lg font-bold text-gray-900 mb-2">${item.price}</p>
            
            {/* 위치 정보 */}
            <div className="flex items-center text-xs text-gray-600 mb-2">
              <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="text-primary font-medium">{distance}</span>
            </div>
            
            {/* 메타 정보 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-gray-500 text-xs">
                <span className="flex items-center">
                  <Eye className="w-3 h-3 mr-1" />
                  {item.views}
                </span>
                <span className="flex items-center">
                  <Heart className="w-3 h-3 mr-1" />
                  {item.likes}
                </span>
              </div>
              <Badge className={`${getCategoryColor(item.category)} text-xs px-2 py-1`}>
                {item.category}
              </Badge>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Default variant for home page
  return (
    <div className="px-4 mb-3">
      <Card className="marketplace-card cursor-pointer hover:shadow-md transition-shadow" onClick={handleCardClick}>
        <div className="p-4">
          <div className="flex space-x-4">
            {/* 왼쪽 이미지 */}
            <div className="relative flex-shrink-0">
              <img
                src={item.images[0] || "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200"}
                alt={item.title}
                className="w-20 h-20 object-cover rounded-lg"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-2 -right-2 text-gray-600 hover:text-red-500 p-1 bg-white rounded-full shadow-sm"
                onClick={handleFavoriteClick}
              >
                <Heart 
                  className={cn(
                    "h-4 w-4",
                    isFavorite ? "fill-red-500 text-red-500" : "fill-none"
                  )} 
                />
              </Button>
            </div>

            {/* 오른쪽 정보 */}
            <div className="flex-1 min-w-0">
              {/* 제목 */}
              <h3 className="font-semibold text-gray-900 text-base mb-1 truncate">{item.title}</h3>
              
              {/* 거리와 대학교 */}
              <div className="flex items-center text-sm text-gray-600 mb-1">
                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="text-primary font-medium">{distance}</span>
                <span className="mx-2">•</span>
                <span className="truncate">{item.school}</span>
              </div>
              
              {/* 가격 */}
              <p className="text-xl font-bold text-gray-900 mb-2">${item.price}</p>
              
              {/* 하단 메타 정보 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 text-gray-500 text-xs">
                  <span className="flex items-center">
                    <Eye className="w-3 h-3 mr-1" />
                    {item.views}
                  </span>
                  <span className="flex items-center">
                    <Heart className="w-3 h-3 mr-1" />
                    {item.likes}
                  </span>
                  <span>{formatTimeAgo(new Date(item.createdAt))}</span>
                </div>
                <Badge className={`${getCategoryColor(item.category)} text-xs px-2 py-1`}>
                  {item.category}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
