import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useExchangeRates } from "@/hooks/use-exchange";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Favorite } from "@shared/schema";

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return "방금 전";
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}일 전`;
  return `${Math.floor(diffInHours / 168)}주 전`;
};

export default function MyFavorites() {
  const { user } = useAuth();
  const { formatPrice } = useExchangeRates();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery<Favorite[]>({
    queryKey: ["/api/favorites"],
    enabled: !!user,
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/favorites/${itemId}`);
    },
    onSuccess: () => {
      toast({
        title: "관심상품에서 제거되었습니다",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
    onError: (error: any) => {
      toast({
        title: "삭제 실패",
        description: error.message || "관심상품을 삭제할 수 없습니다.",
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-lg mx-auto px-4">
          <div className="text-center">
            <p className="text-gray-600">로그인이 필요합니다.</p>
            <Link href="/auth/login">
              <Button className="mt-4">로그인</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/my">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">관심상품</h1>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="w-20 h-20 bg-gray-300 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && favorites.length === 0 && (
          <div className="text-center py-12">
            <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">관심상품이 없습니다</p>
            <Link href="/">
              <Button>상품 둘러보기</Button>
            </Link>
          </div>
        )}

        {/* Favorites List */}
        {!isLoading && favorites.length > 0 && (
          <div className="space-y-4">
            {favorites.map((favorite) => (
              <Card key={favorite.id} className="overflow-hidden">
                <Link to={`/items/${favorite.itemId}`}>
                  <CardContent className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex gap-3">
                      {/* Image */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {favorite.item?.images && favorite.item.images.length > 0 ? (
                          <img
                            src={favorite.item.images[0]}
                            alt={favorite.item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src="/api/placeholder-image.jpg"
                            alt="상품 이미지"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {favorite.item?.title || "상품"}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {favorite.item?.description}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-lg font-semibold text-primary">
                            {formatPrice(favorite.item?.price || 0, favorite.item?.currency)}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {favorite.item?.school}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-400">
                            {formatTimeAgo(new Date(favorite.createdAt))}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.preventDefault();
                              removeFavoriteMutation.mutate(favorite.itemId);
                            }}
                            disabled={removeFavoriteMutation.isPending}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                          >
                            <Heart className="h-4 w-4 fill-current" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}