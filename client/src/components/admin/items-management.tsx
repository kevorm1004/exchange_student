import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Eye, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import type { Item } from "@shared/schema";

export default function ItemsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery<Item[]>({
    queryKey: ["/api/admin/items", searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      
      const response = await fetch(`/api/admin/items?${params}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch items");
      return response.json();
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/admin/items/${itemId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/items"] });
      toast({
        title: "성공",
        description: "상품이 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "상품 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const getCategoryColor = (category: string) => {
    const colors = {
      "전자기기": "bg-blue-100 text-blue-800",
      "도서": "bg-green-100 text-green-800",
      "가구": "bg-purple-100 text-purple-800",
      "가전": "bg-orange-100 text-orange-800",
      "운동/레저": "bg-indigo-100 text-indigo-800",
    };
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm("정말로 이 상품을 삭제하시겠습니까?")) {
      deleteItemMutation.mutate(itemId);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>상품 관리</CardTitle>
        <CardDescription>플랫폼에 등록된 모든 상품을 관리합니다</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="상품 제목, 설명, 카테고리로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>상품</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>가격</TableHead>
                  <TableHead>판매자</TableHead>
                  <TableHead>등록일</TableHead>
                  <TableHead>조회수</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <img
                          src={item.images[0] || "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
                          alt={item.title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-xs text-gray-600 truncate max-w-[200px]">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getCategoryColor(item.category)}>
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${parseFloat(item.price).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{item.sellerId}</p>
                        <p className="text-xs text-gray-600">{item.school}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(item.createdAt?.toString() || new Date().toISOString())}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Eye className="h-3 w-3 text-gray-400" />
                        <span className="text-sm">{item.views}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            상세보기
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {items?.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                등록된 상품이 없습니다
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}