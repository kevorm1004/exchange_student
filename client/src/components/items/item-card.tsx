import { Heart, Eye, Camera, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import type { Item } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ItemCardProps {
  item: Item;
  isFavorite?: boolean;
  onToggleFavorite?: (itemId: string) => void;
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

export default function ItemCard({ item, isFavorite = false, onToggleFavorite }: ItemCardProps) {
  const [, navigate] = useLocation();

  const handleCardClick = () => {
    navigate(`/items/${item.id}`);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(item.id);
  };

  return (
    <div className="px-4 mb-4">
      <Card className="marketplace-card cursor-pointer" onClick={handleCardClick}>
        <div className="relative">
          <img
            src={item.images[0] || "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"}
            alt={item.title}
            className="w-full h-48 object-cover"
          />
          <div className="absolute top-3 right-3 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
            <Camera className="inline w-3 h-3 mr-1" />
            {item.images.length}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-3 left-3 text-white hover:text-red-500 p-1"
            onClick={handleFavoriteClick}
          >
            <Heart 
              className={cn(
                "h-5 w-5",
                isFavorite ? "fill-red-500 text-red-500" : "fill-none"
              )} 
            />
          </Button>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-lg mb-2">{item.title}</h3>
          <p className="text-2xl font-bold text-primary mb-3">${item.price}</p>
          <div className="flex items-center text-gray-600 text-sm mb-2">
            <MapPin className="w-3 h-3 mr-1" />
            <span>{item.location}</span>
            <span className="mx-2">•</span>
            <span>{formatTimeAgo(new Date(item.createdAt))}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-gray-500 text-sm">
              <span className="flex items-center">
                <Eye className="w-3 h-3 mr-1" />
                {item.views}
              </span>
              <span className="flex items-center">
                <Heart className="w-3 h-3 mr-1" />
                {item.likes}
              </span>
            </div>
            <Badge className={getCategoryColor(item.category)}>{item.category}</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
