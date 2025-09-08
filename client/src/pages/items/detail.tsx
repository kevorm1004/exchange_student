import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Heart, MessageCircle, Share, Eye, MapPin, Flag, MoreVertical } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useExchangeRates } from "@/hooks/use-exchange";
import { useFavorites } from "@/hooks/use-favorites";
import { apiRequest } from "@/lib/queryClient";
import type { Item } from "@shared/schema";
import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return "방금 전";
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}일 전`;
  return `${Math.floor(diffInHours / 168)}주 전`;
};

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { formatPrice } = useExchangeRates();
  const queryClient = useQueryClient();
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const { toast } = useToast();

  // Image navigation functions
  const nextImage = useCallback(() => {
    if (!item?.images.length) return;
    setCurrentImageIndex(prev => (prev + 1) % item.images.length);
  }, [item?.images.length]);

  const prevImage = useCallback(() => {
    if (!item?.images.length) return;
    setCurrentImageIndex(prev => prev === 0 ? item.images.length - 1 : prev - 1);
  }, [item?.images.length]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && item?.images.length > 1) {
      nextImage();
    }
    if (isRightSwipe && item?.images.length > 1) {
      prevImage();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Fullscreen handlers
  const openFullscreen = () => setShowFullscreen(true);
  const closeFullscreen = () => setShowFullscreen(false);
  
  // Favorites functionality
  const { 
    isFavorited, 
    addFavorite, 
    removeFavorite, 
    isAddingFavorite, 
    isRemovingFavorite 
  } = useFavorites();

  const { data: item, isLoading } = useQuery<Item>({
    queryKey: ["/api/items", id],
    enabled: !!id,
  });



  // 상품 상태 확인
  const getItemStatus = (item: Item) => {
    if (item.status === "거래완료") return "거래완료";
    if (item.status === "거래기간만료") return "거래기간만료";
    
    // 거래 기간 만료 자동 확인
    if (item.availableTo) {
      const now = new Date();
      const availableTo = new Date(item.availableTo);
      if (now > availableTo) {
        return "거래기간만료";
      }
    }
    
    return "거래가능";
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "거래완료":
        return "bg-gray-500 text-white";
      case "거래기간만료":
        return "bg-red-500 text-white";
      default:
        return "bg-green-500 text-white";
    }
  };

  // Handle favorite toggle
  const handleFavoriteClick = async () => {
    if (!user) {
      toast({
        title: "로그인 필요",
        description: "관심 상품 기능을 사용하려면 로그인하세요.",
        variant: "destructive",
      });
      return;
    }

    if (!id) return;

    try {
      const isCurrentlyFavorited = isFavorited(id);
      
      if (isCurrentlyFavorited) {
        await removeFavorite(id);
        toast({
          title: "관심 상품에서 제거되었습니다",
          variant: "default",
        });
      } else {
        await addFavorite(id);
        toast({
          title: "관심 상품에 추가되었습니다",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Favorite toggle error:', error);
      toast({
        title: "오류가 발생했습니다",
        description: error instanceof Error ? error.message : "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
    }
  };

  const createChatRoomMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/chat/rooms", { itemId: id });
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "채팅방 생성됨",
        description: "판매자와의 채팅방이 생성되었습니다."
      });
      navigate(`/chat/${data.id}`);
    },
    onError: (error: any) => {
      console.error("Chat room creation error:", error);
      toast({
        title: "채팅방 생성 실패",
        description: "채팅방을 생성할 수 없습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    }
  });

  const updateItemStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await apiRequest("PUT", `/api/items/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "상품 상태 변경됨",
        description: "상품 상태가 성공적으로 변경되었습니다."
      });
      // Invalidate and refetch item data
      queryClient.invalidateQueries({ queryKey: ["/api/items", id] });
    },
    onError: (error: any) => {
      console.error("Status update error:", error);
      toast({
        title: "상태 변경 실패",
        description: "상품 상태를 변경할 수 없습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    }
  });

  const reportItemMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/items/${id}/report`, {
        reason: reportReason,
        description: reportDescription
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "신고가 접수되었습니다",
        description: "신고가 성공적으로 접수되었습니다. 검토 후 조치하겠습니다."
      });
      setShowReportDialog(false);
      setReportReason("");
      setReportDescription("");
    },
    onError: (error: any) => {
      console.error("Report error:", error);
      toast({
        title: "신고 접수 실패",
        description: "신고를 접수할 수 없습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    }
  });

  const handleChatStart = () => {
    if (!user) {
      navigate("/auth/login");
      return;
    }
    
    if (!item) return;
    
    // 자신의 상품인 경우 채팅을 시작할 수 없음
    if (item.sellerId === user.id) {
      toast({
        title: "알림",
        description: "자신의 상품에는 채팅을 시작할 수 없습니다.",
        variant: "destructive"
      });
      return;
    }
    
    createChatRoomMutation.mutate();
  };

  const handleReportSubmit = () => {
    if (!reportReason) {
      toast({
        title: "신고 사유 필요",
        description: "신고 사유를 선택해주세요.",
        variant: "destructive"
      });
      return;
    }
    reportItemMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">상품을 찾을 수 없습니다.</p>
        <Button onClick={() => navigate("/")} className="mt-4">
          홈으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-gray-600"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            뒤로
          </Button>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
              onClick={handleChatStart}
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-600"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                  <Flag className="w-4 h-4 mr-2" />
                  신고하기
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => console.log("Share")}>
                  <Share className="w-4 h-4 mr-2" />
                  공유하기
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="pb-20">
        {/* Image Gallery */}
        <div 
          className="relative bg-black cursor-pointer"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={openFullscreen}
        >
          <img
            src={item.images[currentImageIndex] || "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"}
            alt={`${item.title} - ${currentImageIndex + 1}`}
            className="w-full h-80 object-cover"
          />
          {item.images.length > 1 && (
            <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white text-sm px-2 py-1 rounded-full">
              {currentImageIndex + 1} / {item.images.length}
            </div>
          )}
        </div>

        <div className="px-4 pt-4 space-y-4">
          {/* Item Info */}
          <Card className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-2">
                <Badge className={getStatusBadgeColor(getItemStatus(item))}>
                  {getItemStatus(item)}
                </Badge>
              </div>
              <div className="flex items-center text-gray-500 text-sm space-x-3">
                <span className="flex items-center">
                  <Eye className="w-4 h-4 mr-1" />
                  {item.views}
                </span>
                <span className="flex items-center">
                  <Heart className="w-4 h-4 mr-1" />
                  {item.likes}
                </span>
              </div>
            </div>
            
            <h1 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h1>
            <p className="text-3xl font-bold text-primary mb-3">{formatPrice(parseFloat(item.price), (item as any).currency || 'KRW')}</p>
            
            <div className="flex items-center text-gray-600 text-sm mb-4">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{item.country}, {item.location}</span>
              <span className="mx-2">•</span>
              <span>{formatTimeAgo(new Date(item.createdAt))}</span>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">상품 설명</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{item.description}</p>
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">상품 상태</span>
                  <p className="font-medium">{item.condition}</p>
                </div>
                <div>
                  <span className="text-gray-500">거래 방식</span>
                  <p className="font-medium">{item.deliveryMethod || "직거래"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                <div>
                  <span className="text-gray-500">거래 국가</span>
                  <p className="font-medium">{item.country}</p>
                </div>
                <div>
                  <span className="text-gray-500">거래 장소</span>
                  <p className="font-medium">{item.location}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Seller Info */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">판매자 정보</h3>
              {user && user.id === item.sellerId && (
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateItemStatusMutation.mutate("거래가능")}
                    disabled={updateItemStatusMutation.isPending || getItemStatus(item) === "거래가능"}
                    className="text-xs"
                  >
                    거래가능
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateItemStatusMutation.mutate("거래완료")}
                    disabled={updateItemStatusMutation.isPending || getItemStatus(item) === "거래완료"}
                    className="text-xs"
                  >
                    거래완료
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateItemStatusMutation.mutate("거래기간만료")}
                    disabled={updateItemStatusMutation.isPending || getItemStatus(item) === "거래기간만료"}
                    className="text-xs"
                  >
                    기간만료
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">판매자</p>
                <p className="text-sm text-gray-600">{item.school}</p>
              </div>
            </div>
          </Card>
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-md mx-auto flex space-x-3">
          <Button 
            variant="outline" 
            size="lg"
            className="flex-1 h-12"
            onClick={handleFavoriteClick}
            disabled={isAddingFavorite || isRemovingFavorite}
          >
            <Heart className={cn(
              "w-5 h-5 mr-2",
              id && isFavorited(id) ? "fill-red-500 text-red-500" : "fill-none"
            )} />
            {id && isFavorited(id) ? "찜 해제" : "찜하기"}
          </Button>
          <Button 
            size="lg"
            className="flex-1 h-12 marketplace-button-primary"
            onClick={handleChatStart}
            disabled={createChatRoomMutation.isPending}
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            {createChatRoomMutation.isPending ? "채팅방 생성 중..." : "채팅하기"}
          </Button>
        </div>
      </div>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>상품 신고하기</DialogTitle>
            <DialogDescription>
              부적절한 상품을 신고해주세요. 신고된 내용은 검토 후 조치됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">신고 사유</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger>
                  <SelectValue placeholder="신고 사유를 선택해주세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="부적절한 내용">부적절한 내용</SelectItem>
                  <SelectItem value="사기 의심">사기 의심</SelectItem>
                  <SelectItem value="스팸/광고">스팸/광고</SelectItem>
                  <SelectItem value="가격 조작">가격 조작</SelectItem>
                  <SelectItem value="중복 게시">중복 게시</SelectItem>
                  <SelectItem value="기타">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">상세 설명 (선택사항)</Label>
              <Textarea
                id="description"
                placeholder="신고 사유를 자세히 설명해주세요."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReportDialog(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleReportSubmit}
              disabled={reportItemMutation.isPending || !reportReason}
            >
              {reportItemMutation.isPending ? "신고 중..." : "신고하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
