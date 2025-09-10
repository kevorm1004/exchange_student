import { useState, useEffect, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Plus, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/layout/header";
import FilterBar from "@/components/items/filter-bar";
import ItemCard from "@/components/items/item-card";
import type { Item } from "@shared/schema";

export default function Home() {
  const [filter, setFilter] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ["/api/items", filter, user?.school, selectedCountry, onlyAvailable],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams();
      if (filter === "school" && user?.school) params.append("school", user.school);
      if (filter === "country" && selectedCountry !== "all") params.append("country", selectedCountry);
      if (onlyAvailable) params.append("onlyAvailable", "true");
      params.append("page", pageParam.toString());
      params.append("limit", "10");
      
      const response = await fetch(`/api/items?${params}`);
      if (!response.ok) throw new Error("Failed to fetch items");
      return response.json();
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 10 ? allPages.length : undefined;
    },
    initialPageParam: 0,
    // Keep previous data while fetching to prevent flicker
    placeholderData: (previousData) => previousData,
  });

  // Flatten pages and deduplicate items by ID to prevent key conflicts
  const items = data?.pages.flat().reduce((acc: Item[], item: Item) => {
    if (!acc.some(existingItem => existingItem.id === item.id)) {
      acc.push(item);
    }
    return acc;
  }, []) || [];

  // 스크롤 위치 저장 및 복원
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('homeScrollPosition');
    if (savedScrollPosition) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPosition));
        sessionStorage.removeItem('homeScrollPosition');
      }, 100);
    }
  }, []);

  // 스크롤 위치 저장
  const saveScrollPosition = () => {
    sessionStorage.setItem('homeScrollPosition', window.scrollY.toString());
  };

  // Infinite scroll implementation
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop >=
      document.documentElement.offsetHeight - 1000
    ) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const handleCreatePost = () => {
    if (!user) {
      navigate("/auth/login");
      return;
    }
    navigate("/items/create");
  };

  const handleToggleFavorite = async (itemId: string) => {
    if (!user) {
      navigate("/auth/login");
      return;
    }
    
    try {
      const response = await fetch(`/api/items/${itemId}/toggle-like`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });
      
      if (response.ok) {
        // Refetch items to update like count
        // In a real app, you'd want to optimistically update the UI
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">상품을 불러오는 중 오류가 발생했습니다.</p>
      </div>
    );
  }

  return (
    <>
      <Header title="중고물품" />
      <FilterBar 
        filter={filter} 
        onFilterChange={setFilter}
        selectedCountry={selectedCountry}
        onCountryChange={setSelectedCountry}
        onlyAvailable={onlyAvailable}
        onToggleAvailable={setOnlyAvailable}
        user={user}
      />
      
      <main className="pb-20 pt-4">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">등록된 상품이 없습니다</p>
            <Button onClick={handleCreatePost} className="marketplace-button-primary">
              첫 번째 상품 등록하기
            </Button>
          </div>
        ) : (
          <>
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onToggleFavorite={handleToggleFavorite}
                onItemClick={saveScrollPosition}
              />
            ))}
            
            {/* Loading indicator at bottom */}
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-gray-600">상품을 불러오고 있습니다...</span>
              </div>
            )}
            
            {!hasNextPage && items.length > 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>모든 상품을 확인했습니다</p>
              </div>
            )}
          </>
        )}
      </main>

      <Button 
        onClick={handleCreatePost}
        className="marketplace-floating-button"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </>
  );
}
