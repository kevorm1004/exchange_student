import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Upload } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRequireAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { insertItemSchema, type InsertItem } from "@shared/schema";

const categories = [
  "전자기기",
  "도서",
  "가구",
  "가전",
  "운동/레저",
  "의류",
  "생활용품",
  "기타",
];

const conditions = [
  "새 상품",
  "거의 새 것",
  "양호",
  "사용감 있음",
  "많이 사용함",
];

export default function CreateItem() {
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useRequireAuth();
  const queryClient = useQueryClient();

  const form = useForm<InsertItem>({
    resolver: zodResolver(insertItemSchema),
    defaultValues: {
      title: "",
      description: "",
      price: "",
      category: "",
      condition: "",
      images: [],
      location: "",
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: InsertItem) => {
      const res = await apiRequest("POST", "/api/items", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({
        title: "상품 등록 성공",
        description: "상품이 성공적으로 등록되었습니다.",
      });
      navigate("/");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "상품 등록 실패",
        description: "상품 등록 중 오류가 발생했습니다.",
      });
    },
  });

  const onSubmit = async (data: InsertItem) => {
    setIsLoading(true);
    try {
      createItemMutation.mutate(data);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

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
          <h1 className="text-lg font-semibold">상품 등록</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="pb-20 pt-4 px-4">
        <Card>
          <CardHeader>
            <CardTitle>상품 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Image Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">상품 사진</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">사진을 업로드하세요</p>
                    <p className="text-xs text-gray-400">최대 10장까지 가능</p>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>제목</FormLabel>
                      <FormControl>
                        <Input placeholder="상품 제목을 입력하세요" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>설명</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="상품에 대한 자세한 설명을 입력하세요"
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>가격 (USD)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="0"
                          type="number"
                          step="0.01"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>카테고리</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="카테고리를 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>상품 상태</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="상품 상태를 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {conditions.map((condition) => (
                            <SelectItem key={condition} value={condition}>
                              {condition}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>거래 희망 장소</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="거래를 희망하는 장소를 입력하세요"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full marketplace-button-primary"
                  disabled={isLoading || createItemMutation.isPending}
                >
                  {isLoading || createItemMutation.isPending ? "등록 중..." : "상품 등록"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
