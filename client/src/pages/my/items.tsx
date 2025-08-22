import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Plus, Edit, Trash2, Eye, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useExchangeRates } from "@/hooks/use-exchange";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Item } from "@shared/schema";

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return "방금 전";
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}일 전`;
  return `${Math.floor(diffInHours / 168)}주 전`;
};

export default function MyItems() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { formatPrice } = useExchangeRates();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Parse query parameters
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const statusFilter = searchParams.get('status');

  const { data: allItems = [], isLoading } = useQuery<Item[]>({
    queryKey: ["/api/items/my"],
    enabled: !!user,
  });

  // Filter items based on status
  const items = allItems.filter(item => {
    if (!statusFilter) return true;
    
    const itemStatus = getItemStatus(item);
    
    if (statusFilter === 'selling') {
      return itemStatus === '거래가능';
    } else if (statusFilter === 'sold') {
      return itemStatus === '거래완료';
    } else if (statusFilter === 'purchased') {
      // For purchased items, we would need a different API endpoint
      // For now, return empty since this is seller's items
      return false;
    }
    
    return true;
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/items/${itemId}`);
    },
    onSuccess: () => {
      toast({
        title: "상품이 삭제되었습니다",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/items/my"] });
    },
    onError: (error: any) => {
      toast({
        title: "삭제 실패",
        description: error.message || "상품을 삭제할 수 없습니다.",
        variant: "destructive",
      });
    },
  });

  const getItemStatus = (item: Item) => {
    if (item.status === "거래완료") return "거래완료";
    if (item.status === "거래기간만료") return "거래기간만료";
    
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
            <h1 className="text-lg font-semibold ml-3">내 상품 관리</h1>
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
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/my">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold ml-3">내 상품 관리</h1>
          </div>
          <Link to="/items/create">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              등록
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <Plus className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 상품이 없어요</h3>
            <p className="text-gray-500 mb-6">첫 번째 상품을 등록해보세요!</p>
            <Link to="/items/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                상품 등록하기
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const status = getItemStatus(item);
              return (
                <Card key={item.id} className="p-4">
                  <div className="flex space-x-3">
                    <Link 
                      to={`/items/${item.id}`}
                      className="flex-shrink-0"
                    >
                      <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden">
                        {item.images && item.images.length > 0 && (
                          <img
                            src={item.images[0]}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    </Link>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <Badge className={getStatusBadgeColor(status)} variant="secondary">
                          {status}
                        </Badge>
                        <div className="flex space-x-1">
                          <Link to={`/items/${item.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>상품을 삭제하시겠습니까?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  이 작업은 되돌릴 수 없습니다. 상품과 관련된 모든 데이터가 영구적으로 삭제됩니다.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteItemMutation.mutate(item.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  삭제
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      
                      <Link to={`/items/${item.id}`}>
                        <h3 className="font-medium text-gray-900 truncate mb-1">{item.title}</h3>
                        <p className="text-lg font-bold text-primary mb-2">
                          {formatPrice(parseFloat(item.price), (item as any).currency || 'KRW')}
                        </p>
                      </Link>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{formatTimeAgo(new Date(item.createdAt))}</span>
                        <div className="flex items-center space-x-3">
                          <span className="flex items-center">
                            <Eye className="w-3 h-3 mr-1" />
                            {item.views}
                          </span>
                          <span className="flex items-center">
                            <Heart className="w-3 h-3 mr-1" />
                            {item.likes}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}