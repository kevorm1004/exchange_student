import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/layout/header";
import FilterBar from "@/components/items/filter-bar";
import ItemCard from "@/components/items/item-card";
import type { Item } from "@shared/schema";

export default function Home() {
  const [filter, setFilter] = useState("all");
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const { data: items = [], isLoading } = useQuery<Item[]>({
    queryKey: ["/api/items", filter, user?.school, user?.country],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter === "school" && user?.school) params.append("school", user.school);
      if (filter === "country" && user?.country) params.append("country", user.country);
      
      const response = await fetch(`/api/items?${params}`);
      if (!response.ok) throw new Error("Failed to fetch items");
      return response.json();
    },
  });

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

  const handleLoadMore = () => {
    // TODO: Implement pagination
    console.log("Load more items");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Header title="ExchangeMart" />
      <FilterBar activeFilter={filter} onFilterChange={setFilter} />
      
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
              />
            ))}
            
            <div className="px-4 py-6">
              <Button 
                onClick={handleLoadMore}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200"
                variant="outline"
              >
                더 많은 상품 보기
              </Button>
            </div>
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
