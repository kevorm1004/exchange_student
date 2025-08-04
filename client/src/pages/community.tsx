import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, MessageSquare, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/layout/header";
import FilterBar from "@/components/items/filter-bar";
import type { CommunityPost } from "@shared/schema";

export default function Community() {
  const [filter, setFilter] = useState("all");
  const { user } = useAuth();

  const { data: posts = [], isLoading } = useQuery<CommunityPost[]>({
    queryKey: ["/api/community/posts", filter, user?.school, user?.country],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter === "school" && user?.school) params.append("school", user.school);
      if (filter === "country" && user?.country) params.append("country", user.country);
      
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Header title="커뮤니티" />
      <FilterBar activeFilter={filter} onFilterChange={setFilter} />
      
      <main className="pb-20 pt-4">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">아직 게시글이 없습니다</p>
            <Button className="marketplace-button-primary">
              첫 번째 게시글 작성하기
            </Button>
          </div>
        ) : (
          <div className="px-4 space-y-4">
            {posts.map((post) => (
              <Card key={post.id} className="p-4 cursor-pointer hover:bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-2">{post.title}</h3>
                <p className="text-gray-700 text-sm mb-3 line-clamp-2">{post.content}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>{post.school}</span>
                    <span>•</span>
                    <span>{formatTimeAgo(new Date(post.createdAt))}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center">
                      <Heart className="w-4 h-4 mr-1" />
                      {post.likes}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Button className="marketplace-floating-button">
        <Plus className="h-6 w-6" />
      </Button>
    </>
  );
}
