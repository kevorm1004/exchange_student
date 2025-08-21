import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Star, MessageSquare, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewerId: string;
  reviewerName: string;
  itemId: string;
  itemTitle: string;
  itemImage?: string;
}

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
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
      <span className="ml-1 text-sm text-gray-600">({rating})</span>
    </div>
  );
};

export default function MyReviews() {
  const { user } = useAuth();

  // 받은 리뷰 조회
  const { data: receivedReviews = [], isLoading: isLoadingReceived } = useQuery<Review[]>({
    queryKey: ["/api/reviews/received"],
    enabled: !!user,
  });

  // 작성한 리뷰 조회  
  const { data: writtenReviews = [], isLoading: isLoadingWritten } = useQuery<Review[]>({
    queryKey: ["/api/reviews/written"],
    enabled: !!user,
  });

  const calculateAverageRating = (reviews: Review[]): number => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return parseFloat((sum / reviews.length).toFixed(1));
  };

  const isLoading = isLoadingReceived || isLoadingWritten;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-md mx-auto flex items-center">
            <Link to="/my">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold ml-3">리뷰 관리</h1>
          </div>
        </header>
        <div className="max-w-md mx-auto p-4">
          <div className="text-center py-8">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-md mx-auto flex items-center">
          <Link to="/my">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold ml-3">리뷰 관리</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {/* 리뷰 통계 */}
        <Card className="p-4 mb-4">
          <h3 className="font-semibold mb-3">리뷰 통계</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {calculateAverageRating(receivedReviews)}
              </div>
              <div className="text-sm text-gray-600">평균 평점</div>
              <StarRating rating={Math.round(calculateAverageRating(receivedReviews))} />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{receivedReviews.length}</div>
              <div className="text-sm text-gray-600">받은 리뷰</div>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="received" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received">
              받은 리뷰 ({receivedReviews.length})
            </TabsTrigger>
            <TabsTrigger value="written">
              작성한 리뷰 ({writtenReviews.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="space-y-4 mt-4">
            {receivedReviews.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-gray-400 mb-4">
                  <Star className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">받은 리뷰가 없어요</h3>
                <p className="text-gray-500">거래를 완료하면 구매자가 리뷰를 남겨줍니다</p>
              </div>
            ) : (
              receivedReviews.map((review) => (
                <Card key={review.id} className="p-4">
                  <div className="flex items-start space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {review.reviewerName?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{review.reviewerName}</span>
                          <StarRating rating={review.rating} />
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatTimeAgo(new Date(review.createdAt))}
                        </span>
                      </div>
                      
                      {review.comment && (
                        <p className="text-gray-700 mb-3">{review.comment}</p>
                      )}
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <MessageSquare className="w-4 h-4 mr-1" />
                        <span>상품: {review.itemTitle}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="written" className="space-y-4 mt-4">
            {writtenReviews.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-gray-400 mb-4">
                  <MessageSquare className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">작성한 리뷰가 없어요</h3>
                <p className="text-gray-500">구매한 상품에 대해 리뷰를 남겨보세요</p>
              </div>
            ) : (
              writtenReviews.map((review) => (
                <Card key={review.id} className="p-4">
                  <div className="flex items-start space-x-3">
                    {review.itemImage && (
                      <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={review.itemImage}
                          alt={review.itemTitle}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <StarRating rating={review.rating} />
                        <span className="text-sm text-gray-500">
                          {formatTimeAgo(new Date(review.createdAt))}
                        </span>
                      </div>
                      
                      <h4 className="font-medium mb-1">{review.itemTitle}</h4>
                      
                      {review.comment && (
                        <p className="text-gray-700 text-sm">{review.comment}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}