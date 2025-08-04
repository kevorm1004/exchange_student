import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, X, Search, Trash2 } from "lucide-react";

interface SearchHistory {
  id: string;
  query: string;
  timestamp: number;
}

function SearchPage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);

  // Load search history from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem("searchHistory");
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch (error) {
        console.error("Failed to parse search history:", error);
        setSearchHistory([]);
      }
    }
  }, []);

  // Save search history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
  }, [searchHistory]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Add to search history
      const newHistoryItem: SearchHistory = {
        id: Date.now().toString(),
        query: searchQuery.trim(),
        timestamp: Date.now(),
      };

      // Remove duplicate if exists and add to front
      const filteredHistory = searchHistory.filter(
        (item) => item.query !== searchQuery.trim()
      );
      const updatedHistory = [newHistoryItem, ...filteredHistory].slice(0, 10); // Keep only 10 recent searches
      
      setSearchHistory(updatedHistory);

      // Navigate to search results page
      navigate(`/search/${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleHistoryItemClick = (query: string) => {
    setSearchQuery(query);
    handleSearch();
  };

  const removeHistoryItem = (id: string) => {
    setSearchHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const clearAllHistory = () => {
    setSearchHistory([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-gray-600 p-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="상품을 검색해보세요"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10 pr-4 py-2 w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              autoFocus
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-gray-600 p-1"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Search History */}
      <div className="p-4">
        {searchHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-700">최근 검색</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllHistory}
                className="text-gray-500 hover:text-red-500 p-1"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                전체 삭제
              </Button>
            </div>
            
            <div className="divide-y divide-gray-100">
              {searchHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleHistoryItemClick(item.query)}
                >
                  <div className="flex items-center space-x-3">
                    <Search className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-800">{item.query}</span>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeHistoryItem(item.id);
                    }}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {searchHistory.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">최근 검색 기록이 없습니다</p>
            <p className="text-gray-400 text-xs mt-1">원하는 상품을 검색해보세요</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchPage;