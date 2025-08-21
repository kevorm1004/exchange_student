import { Heart, Eye, Camera, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import { useExchangeRates } from "@/hooks/use-exchange";
import { useToast } from "@/hooks/use-toast";
import type { Item } from "@shared/schema";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";

interface ItemCardProps {
  item: Item;
  isFavorite?: boolean;
  onToggleFavorite?: (itemId: string) => void;
  variant?: "default" | "grid"; // grid variant for search results
  onItemClick?: () => void;
}



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

interface ItemCardProps {
  item: Item;
  isFavorite?: boolean;
  onToggleFavorite?: (itemId: string) => void;
  variant?: "default" | "grid";
  onItemClick?: () => void;
}

export default function ItemCard({ item, isFavorite = false, onToggleFavorite, variant = "default", onItemClick }: ItemCardProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { formatPrice } = useExchangeRates();
  const { toast } = useToast();
  const { 
    isFavorited, 
    addFavorite, 
    removeFavorite, 
    isAddingFavorite, 
    isRemovingFavorite 
  } = useFavorites();
  
  // 가격 표시 (환율 서비스 사용)
  const displayPrice = formatPrice(parseFloat(item.price), (item as any).currency || 'KRW');
  
  // 내부 관심 상품 상태
  const isItemFavorited = isFavorite || isFavorited(item.id);

  // 상품 상태 확인
  const getItemStatus = (item: Item) => {
    if (item.status === "거래완료") return "거래완료";
    if (item.status === "거래기간만료") return "거래기간만료";
    
    // 거래 기간 만료 자동 확인
    if (item.availableTo) {
      const now = new Date();
      const availableTo = new Date(item.availableTo);
      if (now > availableTo) {
        return "거래기간만료";
      }
    }
    
    return "거래가능";
  };

  const itemStatus = getItemStatus(item);
  const isInactive = itemStatus !== "거래가능";

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "거래완료":
        return "bg-gray-500 text-white";
      case "거래기간만료":
        return "bg-red-500 text-white";
      default:
        return "bg-green-500 text-white";
    }
  };

  const handleCardClick = () => {
    onItemClick?.();
    navigate(`/items/${item.id}`);
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "로그인 필요",
        description: "관심 상품 기능을 사용하려면 로그인하세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Toggling favorite for item:', item.id);
      console.log('Current favorite status:', isItemFavorited);
      
      if (isItemFavorited) {
        console.log('Removing from favorites...');
        await removeFavorite(item.id);
        toast({
          title: "관심 상품에서 제거되었습니다",
          variant: "default",
        });
      } else {
        console.log('Adding to favorites...');
        await addFavorite(item.id);
        toast({
          title: "관심 상품에 추가되었습니다",
          variant: "default",
        });
      }
      
      // Also call external handler if provided
      onToggleFavorite?.(item.id);
    } catch (error) {
      console.error('Favorite toggle error:', error);
      toast({
        title: "오류가 발생했습니다",
        description: error instanceof Error ? error.message : "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
    }
  };

  const distance = user ? calculateDistance(user.school, item.school) : "알 수 없음";

  // Grid variant for search results
  if (variant === "grid") {
    return (
      <Card className={cn(
        "marketplace-card cursor-pointer hover:shadow-md transition-shadow relative",
        isInactive && "opacity-60"
      )} onClick={handleCardClick}>
        <div className={cn("p-4", isInactive && "grayscale")}>
          {/* 상단 이미지 */}
          <div className="relative mb-3">
            <img
              src={item.images[0] || "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=500"}
              alt={item.title}
              className="w-full h-56 object-cover rounded-lg"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 text-gray-600 hover:text-red-500 p-1 bg-white rounded-full shadow-sm"
              onClick={handleFavoriteClick}
              disabled={isAddingFavorite || isRemovingFavorite}
            >
              <Heart 
                className={cn(
                  "h-4 w-4",
                  isItemFavorited ? "fill-red-500 text-red-500" : "fill-none",
                  (isAddingFavorite || isRemovingFavorite) && "opacity-50"
                )} 
              />
            </Button>
          </div>

          {/* 하단 정보 */}
          <div className="flex flex-col h-full">
            {/* 제목 */}
            <h3 className="font-semibold text-gray-900 text-xs mb-2 line-clamp-2 leading-tight">{item.title}</h3>
            
            {/* 가격 */}
            <p className="text-base font-bold text-gray-900 mb-2">{displayPrice}</p>
            
            {/* 위치 정보 */}
            <div className="flex items-center text-xs text-gray-600 mb-2">
              <MapPin className="w-2.5 h-2.5 mr-1 flex-shrink-0" />
              <span className="text-primary font-medium text-xs">{distance}</span>
            </div>
            
            {/* 메타 정보 - 하단에 고정 */}
            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center space-x-2 text-gray-500 text-xs">
                <span className="flex items-center">
                  <Eye className="w-3 h-3 mr-1" />
                  {item.views}
                </span>
                <span className="flex items-center">
                  <Heart className="w-3 h-3 mr-1" />
                  {item.likes}
                </span>
                <span>{formatTimeAgo(new Date(item.createdAt || new Date()))}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* 상태 배지 - 오른쪽 아래 */}
        {itemStatus !== "거래가능" && (
          <Badge className={cn(
            "absolute bottom-2 right-2 text-xs px-2 py-1",
            getStatusBadgeColor(itemStatus)
          )}>
            {itemStatus}
          </Badge>
        )}
      </Card>
    );
  }

  // Default variant for home page
  return (
    <div className="px-4 mb-3">
      <Card className={cn(
        "marketplace-card cursor-pointer hover:shadow-md transition-shadow relative",
        isInactive && "opacity-60"
      )} onClick={handleCardClick}>
        <div className={cn("p-4", isInactive && "grayscale")}>
          <div className="flex space-x-4">
            {/* 왼쪽 이미지 */}
            <div className="relative flex-shrink-0">
              <img
                src={item.images[0] || "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=500"}
                alt={item.title}
                className="w-32 h-32 object-cover rounded-lg"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-2 -right-2 text-gray-600 hover:text-red-500 p-1 bg-white rounded-full shadow-sm"
                onClick={handleFavoriteClick}
                disabled={isAddingFavorite || isRemovingFavorite}
              >
                <Heart 
                  className={cn(
                    "h-4 w-4",
                    isItemFavorited ? "fill-red-500 text-red-500" : "fill-none",
                    (isAddingFavorite || isRemovingFavorite) && "opacity-50"
                  )} 
                />
              </Button>
            </div>

            {/* 오른쪽 정보 */}
            <div className="flex-1 min-w-0 flex flex-col h-32">
              {/* 제목 */}
              <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">{item.title}</h3>
              
              {/* 거리와 대학교 */}
              <div className="flex items-center text-xs text-gray-600 mb-1">
                <MapPin className="w-2.5 h-2.5 mr-1 flex-shrink-0" />
                <span className="text-primary font-medium text-xs">{distance}</span>
                <span className="mx-1.5">•</span>
                <span className="truncate text-xs">{item.school}</span>
              </div>
              
              {/* 가격 */}
              <p className="text-base font-bold text-gray-900 mb-2">{displayPrice}</p>
              
              {/* 하단 메타 정보 - 하단에 고정 */}
              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center space-x-2 text-gray-500 text-xs">
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
              </div>
            </div>
          </div>
        </div>
        
        {/* 상태 배지 - 오른쪽 아래 */}
        {itemStatus !== "거래가능" && (
          <Badge className={cn(
            "absolute bottom-2 right-2 text-xs px-2 py-1",
            getStatusBadgeColor(itemStatus)
          )}>
            {itemStatus}
          </Badge>
        )}
      </Card>
    </div>
  );
}
