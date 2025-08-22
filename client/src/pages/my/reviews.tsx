import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Star, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return "방금 전";
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}일 전`;
  return `${Math.floor(diffInHours / 168)}주 전`;
};

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating 
              ? "text-yellow-400 fill-yellow-400" 
              : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
};

export default function MyReviews() {
  const { user } = useAuth();

  const { data: receivedReviews = [], isLoading: isLoadingReceived } = useQuery({
    queryKey: ["/api/reviews/received"],
    enabled: !!user,
  });

  const { data: writtenReviews = [], isLoading: isLoadingWritten } = useQuery({
    queryKey: ["/api/reviews/written"],
    enabled: !!user,
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

  // Mock data since review system isn't fully implemented yet
  const mockReceivedReviews = [
    {
      id: "1",
      rating: 5,
      content: "친절하게 설명해주시고 상품 상태도 좋았어요!",
      reviewerName: "구매자123",
      itemTitle: "MacBook Pro 13인치",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: "2", 
      rating: 4,
      content: "약속 시간도 잘 지켜주시고 좋았습니다.",
      reviewerName: "student_kim",
      itemTitle: "iPhone 14",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    }
  ];

  const mockWrittenReviews = [
    {
      id: "1",
      rating: 5,
      content: "설명대로 상태가 좋았고 빠른 배송 감사합니다!",
      sellerName: "판매자456", 
      itemTitle: "iPad Air",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    }
  ];

  const calculateAverageRating = (reviews: any[]) => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return (total / reviews.length).toFixed(1);
  };

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
          <h1 className="text-xl font-semibold">거래후기</h1>
        </div>

        <Tabs defaultValue="received" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received">받은 후기</TabsTrigger>
            <TabsTrigger value="written">작성한 후기</TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="mt-6">
            {/* Stats */}
            <div className="bg-white rounded-lg p-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {calculateAverageRating(mockReceivedReviews)}
                </div>
                <StarRating rating={Math.round(Number(calculateAverageRating(mockReceivedReviews)))} />
                <p className="text-sm text-gray-600 mt-2">
                  총 {mockReceivedReviews.length}개의 후기
                </p>
              </div>
            </div>

            {/* Reviews List */}
            {isLoadingReceived ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="h-4 bg-gray-300 rounded w-24"></div>
                          <div className="h-4 bg-gray-300 rounded w-16"></div>
                        </div>
                        <div className="h-3 bg-gray-300 rounded w-full"></div>
                        <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : mockReceivedReviews.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">받은 후기가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mockReceivedReviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">
                                {review.reviewerName}
                              </span>
                              <StarRating rating={review.rating} />
                            </div>
                            <p className="text-sm text-gray-600">
                              {review.itemTitle}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(review.createdAt)}
                          </span>
                        </div>
                        <p className="text-gray-700">{review.content}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="written" className="mt-6">
            {/* Written Reviews */}
            {isLoadingWritten ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="h-4 bg-gray-300 rounded w-24"></div>
                          <div className="h-4 bg-gray-300 rounded w-16"></div>
                        </div>
                        <div className="h-3 bg-gray-300 rounded w-full"></div>
                        <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : mockWrittenReviews.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">작성한 후기가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mockWrittenReviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">
                                {review.sellerName}
                              </span>
                              <StarRating rating={review.rating} />
                            </div>
                            <p className="text-sm text-gray-600">
                              {review.itemTitle}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(review.createdAt)}
                          </span>
                        </div>
                        <p className="text-gray-700">{review.content}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}