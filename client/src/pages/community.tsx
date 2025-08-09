import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, MessageSquare, Heart, Search, Users, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import type { CommunityPost } from "@shared/schema";
import { COUNTRIES } from "@/lib/countries";

export default function Community() {
  const [activeTab, setActiveTab] = useState<"이야기방" | "모임방">("이야기방");
  const [selectedCountry, setSelectedCountry] = useState("전체");
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: posts = [], isLoading } = useQuery<CommunityPost[]>({
    queryKey: ["/api/community/posts", activeTab, selectedCountry],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("category", activeTab);
      if (selectedCountry !== "전체") {
        params.append("country", selectedCountry);
      }
      
      const response = await fetch(`/api/community/posts?${params}`);
      if (!response.ok) throw new Error("Failed to fetch posts");
      return response.json();
    },
  });

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "방금 전";
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}일 전`;
    return `${Math.floor(diffInHours / 168)}주 전`;
  };

  const handleCreatePost = () => {
    navigate("/community/create");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Country color mapping for meeting cards
  const getCountryColor = (country: string) => {
    const colorMap: { [key: string]: string } = {
      "독일": "bg-red-200 text-red-800",
      "영국": "bg-green-200 text-green-800", 
      "미국": "bg-blue-200 text-blue-800",
      "일본": "bg-orange-200 text-orange-800",
      "중국": "bg-purple-200 text-purple-800",
      "한국": "bg-pink-200 text-pink-800",
      "프랑스": "bg-indigo-200 text-indigo-800",
      "스페인": "bg-yellow-200 text-yellow-800",
    };
    return colorMap[country] || "bg-gray-200 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Logo */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-center">
          <h1 className="text-xl font-bold text-gray-900">커뮤니티</h1>
        </div>
      </div>

      {/* Tab Navigation */}
      <header className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab("이야기방")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "이야기방" 
                  ? "bg-gray-200 text-gray-900" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              이야기방
            </button>
            <button
              onClick={() => setActiveTab("모임방")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "모임방" 
                  ? "bg-gray-200 text-gray-900" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              모임방
            </button>
          </div>
          
          {/* Search Icon */}
          <Button variant="ghost" size="sm" className="p-2">
            <Search className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Country Filter */}
      <div className="px-4 py-3 bg-white border-b">
        <div className="flex space-x-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCountry("전체")}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
              selectedCountry === "전체" 
                ? "bg-gray-900 text-white" 
                : "bg-gray-100 text-gray-700"
            }`}
          >
            전체
          </button>
          {["미국", "일본", "영국", "스페인"].map((country) => (
            <button
              key={country}
              onClick={() => setSelectedCountry(country)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedCountry === country 
                  ? "bg-gray-900 text-white" 
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {country}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="pb-20">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            {activeTab === "이야기방" ? (
              <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            ) : (
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            )}
            <p className="text-gray-500 mb-4">
              아직 {activeTab}에 게시글이 없습니다
            </p>
            <Button onClick={handleCreatePost} className="bg-blue-500 hover:bg-blue-600 text-white">
              첫 번째 게시글 작성하기
            </Button>
          </div>
        ) : (
          <div className="px-4 py-4">
            {activeTab === "이야기방" ? (
              <div className="space-y-4">
                {posts.map((post) => (
                  <Card key={post.id} className="p-4 bg-white cursor-pointer hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 text-base">{post.title}</h3>
                      {post.images && post.images.length > 0 && (
                        <div className="w-16 h-16 bg-gray-200 rounded-lg ml-3 flex-shrink-0">
                          <img 
                            src={post.images[0]} 
                            alt="Post image" 
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {post.content}
                    </p>
                    
                    <div className="flex items-center text-sm text-gray-500">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      <span className="mr-4">{post.commentsCount || 0}</span>
                      
                      <span className="mr-4">{formatTimeAgo(new Date(post.createdAt))}</span>
                      
                      <Eye className="w-4 h-4 mr-1" />
                      <span>{post.views || 0}</span>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {posts.map((post) => (
                  <Card key={post.id} className={`cursor-pointer hover:shadow-md transition-shadow relative ${getCountryColor(post.country)}`}>
                    <div className="p-4">
                      {/* Country Badge */}
                      <div className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium bg-white bg-opacity-80">
                        {post.country}
                      </div>
                      
                      {/* Comments Count */}
                      <div className="absolute top-2 right-2 flex items-center space-x-1 text-xs">
                        <MessageSquare className="w-3 h-3" />
                        <span>{post.commentsCount || 0}</span>
                      </div>

                      <div className="mt-8 mb-2">
                        <div className="text-sm font-medium mb-1">{post.semester || "25-2"}</div>
                        <div className="text-sm text-gray-700 mb-1">{post.school}</div>
                        <h3 className="font-semibold text-sm">{post.title}</h3>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <Button 
        onClick={handleCreatePost}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg z-50"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
