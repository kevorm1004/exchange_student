import { ArrowLeft, Heart, Package, Search } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import { useExchangeRates } from "@/hooks/use-exchange";
import ItemCard from "@/components/items/item-card";
import { useState, useMemo } from "react";

export default function Favorites() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const { favorites, isLoading, removeFavorite } = useFavorites();
  const { formatPrice } = useExchangeRates();

  // Redirect to login if not authenticated
  if (!user) {
    navigate("/auth/login");
    return null;
  }

  // Filter favorites based on search query
  const filteredFavorites = useMemo(() => {
    if (!searchQuery.trim()) return favorites;
    
    return favorites.filter((fav: any) => 
      fav.item?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fav.item?.seller?.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [favorites, searchQuery]);

  const handleToggleFavorite = async (itemId: string) => {
    try {
      await removeFavorite(itemId);
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/my")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">관심 상품</h1>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Heart className="h-4 w-4 mr-1 text-red-500" />
            {favorites?.length || 0}개
          </div>
        </div>

        {/* Search Bar */}
        {favorites?.length > 0 && (
          <div className="px-4 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="관심 상품 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pb-20">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">관심 상품을 불러오는 중...</p>
            </div>
          </div>
        ) : filteredFavorites?.length === 0 && searchQuery ? (
          <div className="text-center py-20 px-4">
            <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">검색 결과가 없습니다</h2>
            <p className="text-gray-500 mb-6">다른 키워드로 검색해보세요</p>
            <Button 
              variant="outline" 
              onClick={() => setSearchQuery("")}
            >
              전체 관심 상품 보기
            </Button>
          </div>
        ) : favorites?.length === 0 ? (
          <div className="text-center py-20 px-4">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">관심 상품이 없습니다</h2>
            <p className="text-gray-500 mb-6">마음에 드는 상품을 하트 버튼으로 저장해보세요</p>
            <Button 
              onClick={() => navigate("/")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              상품 둘러보기
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredFavorites?.map((favorite: any) => (
              <div key={favorite.id}>
                {favorite.item && (
                  <ItemCard
                    item={favorite.item}
                    isFavorite={true}
                    onToggleFavorite={handleToggleFavorite}
                    variant="default"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}