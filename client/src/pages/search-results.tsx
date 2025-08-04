import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ItemCard from "@/components/items/item-card";
import type { Item } from "@shared/schema";

function SearchResults() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/search/:query");
  const query = params?.query ? decodeURIComponent(params.query) : "";
  const [searchInput, setSearchInput] = useState(query);

  // Add current search to history when component mounts
  useEffect(() => {
    if (query.trim()) {
      const newHistoryItem = {
        id: Date.now().toString(),
        query: query.trim(),
        timestamp: Date.now(),
      };

      // Get existing history
      const existingHistory = localStorage.getItem("searchHistory");
      let searchHistory = [];
      if (existingHistory) {
        try {
          searchHistory = JSON.parse(existingHistory);
        } catch (error) {
          console.error("Failed to parse search history:", error);
        }
      }

      // Check if this query already exists in recent history (within last 5 minutes)
      const recentQuery = searchHistory.find((item: any) => 
        item.query === query.trim() && 
        (Date.now() - item.timestamp) < 300000 // 5 minutes
      );

      if (!recentQuery) {
        // Remove duplicate if exists and add to front
        const filteredHistory = searchHistory.filter(
          (item: any) => item.query !== query.trim()
        );
        const updatedHistory = [newHistoryItem, ...filteredHistory].slice(0, 10);
        
        // Save to localStorage
        localStorage.setItem("searchHistory", JSON.stringify(updatedHistory));
      }
    }
  }, [query]);

  // Fetch search results
  const {
    data: items = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["/api/items/search", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const response = await fetch(`/api/items/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Failed to search items");
      return response.json();
    },
    enabled: !!query.trim(),
  });

  const handleSearch = () => {
    if (searchInput.trim()) {
      // Add to search history
      const newHistoryItem = {
        id: Date.now().toString(),
        query: searchInput.trim(),
        timestamp: Date.now(),
      };

      // Get existing history
      const existingHistory = localStorage.getItem("searchHistory");
      let searchHistory = [];
      if (existingHistory) {
        try {
          searchHistory = JSON.parse(existingHistory);
        } catch (error) {
          console.error("Failed to parse search history:", error);
        }
      }

      // Remove duplicate if exists and add to front
      const filteredHistory = searchHistory.filter(
        (item: any) => item.query !== searchInput.trim()
      );
      const updatedHistory = [newHistoryItem, ...filteredHistory].slice(0, 10);
      
      // Save to localStorage
      localStorage.setItem("searchHistory", JSON.stringify(updatedHistory));

      navigate(`/search/${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleToggleFavorite = async (itemId: string) => {
    // TODO: Implement favorite toggle
    console.log("Toggle favorite:", itemId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with search */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/search")}
            className="text-gray-600 p-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="상품을 검색해보세요"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10 pr-4 py-2 w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSearch}
            className="text-blue-500 hover:text-blue-600 px-3"
          >
            검색
          </Button>
        </div>
      </header>

      {/* Search results */}
      <div className="p-4 pb-8">
        {/* Search query display */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            '<span className="font-medium text-gray-900">{query}</span>' 검색 결과
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-500 text-sm mt-4">검색 중...</p>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="text-center py-12">
            <p className="text-red-500 text-sm">검색 중 오류가 발생했습니다.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-4"
            >
              다시 시도
            </Button>
          </div>
        )}

        {/* Results */}
        {!isLoading && !isError && (
          <>
            {items.length > 0 ? (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    총 {items.length}개의 상품을 찾았습니다
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 pb-20">
                  {items.map((item: Item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">검색 결과가 없습니다</p>
                <p className="text-gray-400 text-xs mt-1">
                  다른 검색어로 시도해보세요
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SearchResults;