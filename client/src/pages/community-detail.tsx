import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart, MessageCircle, Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

export default function CommunityDetail() {
  const [, params] = useRoute("/community/post/:id");
  const [, navigate] = useLocation();
  const postId = params?.id;

  const { data: post, isLoading } = useQuery({
    queryKey: ["/api/community/posts", postId],
    enabled: !!postId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">게시글을 찾을 수 없습니다</h2>
          <Button onClick={() => navigate("/community")}>커뮤니티로 돌아가기</Button>
        </div>
      </div>
    );
  }

  const getCountryColor = (country: string) => {
    const colors: Record<string, string> = {
      "대한민국": "bg-red-100 text-red-800 border-red-200",
      "일본": "bg-blue-100 text-blue-800 border-blue-200", 
      "중국": "bg-yellow-100 text-yellow-800 border-yellow-200",
      "미국": "bg-purple-100 text-purple-800 border-purple-200",
      "캐나다": "bg-green-100 text-green-800 border-green-200",
      "호주": "bg-orange-100 text-orange-800 border-orange-200",
    };
    return colors[country] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/community")}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">
              {post.category}
            </h1>
          </div>
          
          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getCountryColor(post.country)}`}>
            {post.country}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {/* Post Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {post.category === "모임방" && (
                <div className="flex items-center space-x-1 text-blue-600">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">모임</span>
                </div>
              )}
              {post.semester && (
                <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {post.semester}
                </span>
              )}
            </div>
            <span className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ko })}
            </span>
          </div>
          
          <h1 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h1>
          
          <div className="text-sm text-gray-600">
            {post.school && <span>{post.school}</span>}
          </div>
        </div>

        {/* Images */}
        {post.images && post.images.length > 0 && (
          <div className="mb-6">
            <div className="grid grid-cols-1 gap-3">
              {post.images.map((image: string, index: number) => (
                <img
                  key={index}
                  src={image}
                  alt={`Post image ${index + 1}`}
                  className="w-full rounded-lg border"
                />
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>
        </div>

        {/* Open Chat Link for 모임방 */}
        {post.category === "모임방" && post.openChatLink && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900 mb-1">오픈 카톡방</h3>
                <p className="text-sm text-blue-700">아래 링크를 클릭하여 참여하세요</p>
              </div>
              <Button
                onClick={() => window.open(post.openChatLink, '_blank')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                참여하기
              </Button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center space-x-6 py-4 border-t border-gray-200">
          <div className="flex items-center space-x-1 text-gray-500">
            <Heart className="w-5 h-5" />
            <span className="text-sm">{post.likes || 0}</span>
          </div>
          <div className="flex items-center space-x-1 text-gray-500">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">{post.commentsCount || 0}</span>
          </div>
          <div className="text-sm text-gray-500">
            조회 {post.views || 0}
          </div>
        </div>
      </div>
    </div>
  );
}