import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Package, MessageSquare, TrendingUp, BarChart3, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import AdminHeader from "@/components/admin/admin-header";
import ItemsManagement from "@/components/admin/items-management";
import UsersManagement from "@/components/admin/users-management";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

interface AdminStats {
  totalUsers: number;
  totalItems: number;
  totalMessages: number;
  activeUsers: number;
  recentItems: number;
  popularCategories: { category: string; count: number }[];
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // 관리자 권한 확인
  useEffect(() => {
    if (!user) {
      navigate("/admin");
      return;
    }
    if (user.role !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stats", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch admin stats");
      return response.json();
    },
    enabled: !!user && user.role === "admin",
  });

  if (!user || user.role !== "admin") {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">관리자 대시보드</h1>
          <p className="text-gray-600">ExchangeMart 플랫폼 관리</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="items">상품 관리</TabsTrigger>
            <TabsTrigger value="users">사용자 관리</TabsTrigger>
            <TabsTrigger value="settings">설정</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">총 사용자</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    활성 사용자: {stats?.activeUsers || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">총 상품</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalItems || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    최근 등록: {stats?.recentItems || 0}개
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">총 메시지</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalMessages || 0}</div>
                  <p className="text-xs text-muted-foreground">채팅 활동</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">성장률</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+12.5%</div>
                  <p className="text-xs text-muted-foreground">지난 주 대비</p>
                </CardContent>
              </Card>
            </div>

            {/* 인기 카테고리 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  인기 카테고리
                </CardTitle>
                <CardDescription>가장 많이 등록된 상품 카테고리</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.popularCategories?.map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{index + 1}</Badge>
                        <span className="font-medium">{category.category}</span>
                      </div>
                      <span className="text-sm text-gray-600">{category.count}개</span>
                    </div>
                  )) || (
                    <p className="text-gray-500">데이터가 없습니다</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="items">
            <ItemsManagement />
          </TabsContent>

          <TabsContent value="users">
            <UsersManagement />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  시스템 설정
                </CardTitle>
                <CardDescription>플랫폼 전체 설정 관리</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">신규 사용자 등록</h3>
                    <p className="text-sm text-gray-600">새로운 사용자의 계정 생성을 허용합니다</p>
                  </div>
                  <Button variant="outline">설정</Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">상품 등록 제한</h3>
                    <p className="text-sm text-gray-600">사용자당 최대 등록 가능한 상품 수를 설정합니다</p>
                  </div>
                  <Button variant="outline">설정</Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">이메일 알림</h3>
                    <p className="text-sm text-gray-600">시스템 이메일 알림을 설정합니다</p>
                  </div>
                  <Button variant="outline">설정</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}