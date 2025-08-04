import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Package, MessageSquare, TrendingUp, BarChart3, Settings, Download, Eye, ShoppingCart, Activity } from "lucide-react";
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

interface DailyStats {
  dailyVisitors: number;
  dailyItemRegistrations: number;
  dailyCompletedTrades: number;
  weeklyStats: { date: string; visitors: number; items: number; trades: number }[];
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { user } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!user || user.role !== "admin") {
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

  const { data: dailyStats, isLoading: isDailyLoading } = useQuery<DailyStats>({
    queryKey: ["/api/admin/daily-stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/daily-stats", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch daily stats");
      return response.json();
    },
    enabled: !!user && user.role === "admin",
  });

  const handleExportUsers = async () => {
    try {
      const response = await fetch("/api/admin/export/users", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to export users");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting users:", error);
    }
  };

  const handleExportItems = async () => {
    try {
      const response = await fetch("/api/admin/export/items", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to export items");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'items.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting items:", error);
    }
  };

  if (!user || user.role !== "admin") {
    return null;
  }

  if (isLoading || isDailyLoading) {
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
            <TabsTrigger value="overview">대시보드</TabsTrigger>
            <TabsTrigger value="users">사용자 데이터</TabsTrigger>
            <TabsTrigger value="items">물품 데이터</TabsTrigger>
            <TabsTrigger value="management">관리</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* 일별 통계 카드들 */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">오늘 방문자 수</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{dailyStats?.dailyVisitors || 0}명</div>
                  <p className="text-xs text-muted-foreground">
                    일일 순 방문자
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">오늘 물품 등록</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{dailyStats?.dailyItemRegistrations || 0}개</div>
                  <p className="text-xs text-muted-foreground">
                    신규 등록 물품
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">오늘 거래 완료</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{dailyStats?.dailyCompletedTrades || 0}건</div>
                  <p className="text-xs text-muted-foreground">
                    완료된 거래
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 주간 통계 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  최근 7일 활동 통계
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dailyStats?.weeklyStats?.map((day) => (
                    <div key={day.date} className="grid grid-cols-4 gap-4 items-center py-2 border-b border-gray-100">
                      <div className="text-sm font-medium">
                        {new Date(day.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-sm text-center">
                        <span className="text-blue-600 font-semibold">{day.visitors}</span>
                        <span className="text-xs text-muted-foreground ml-1">명</span>
                      </div>
                      <div className="text-sm text-center">
                        <span className="text-green-600 font-semibold">{day.items}</span>
                        <span className="text-xs text-muted-foreground ml-1">개</span>
                      </div>
                      <div className="text-sm text-center">
                        <span className="text-purple-600 font-semibold">{day.trades}</span>
                        <span className="text-xs text-muted-foreground ml-1">건</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-4 items-center py-2 border-t-2 border-gray-200 mt-4 pt-4">
                  <div className="text-sm font-bold">항목</div>
                  <div className="text-sm font-bold text-center text-blue-600">방문자</div>
                  <div className="text-sm font-bold text-center text-green-600">물품등록</div>
                  <div className="text-sm font-bold text-center text-purple-600">거래완료</div>
                </div>
              </CardContent>
            </Card>

            {/* 전체 통계 */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">전체 사용자</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    활성 사용자: {stats?.activeUsers || 0}명
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">전체 상품</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalItems || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    최근 7일: {stats?.recentItems || 0}개
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">전체 메시지</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalMessages || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    채팅 활동량
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">인기 카테고리</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats?.popularCategories?.slice(0, 3).map((category, index) => (
                      <div key={category.category} className="flex items-center justify-between text-sm">
                        <span>{category.category}</span>
                        <Badge variant="secondary">{category.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">사용자 데이터</h2>
                <p className="text-muted-foreground">등록된 모든 사용자 정보를 확인하고 내보낼 수 있습니다</p>
              </div>
              <Button onClick={handleExportUsers} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                엑셀로 내보내기
              </Button>
            </div>
            <UsersManagement />
          </TabsContent>

          <TabsContent value="items" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">물품 데이터</h2>
                <p className="text-muted-foreground">등록된 모든 물품 정보를 확인하고 내보낼 수 있습니다</p>
              </div>
              <Button onClick={handleExportItems} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                엑셀로 내보내기
              </Button>
            </div>
            <ItemsManagement />
          </TabsContent>

          <TabsContent value="management" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    사용자 관리
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    사용자 계정 상태를 관리하고 문제가 있는 계정을 처리할 수 있습니다.
                  </p>
                  <Button 
                    onClick={() => setActiveTab("users")} 
                    variant="outline" 
                    className="w-full"
                  >
                    사용자 관리로 이동
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    물품 관리
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    부적절한 물품을 삭제하고 물품 게시 상태를 관리할 수 있습니다.
                  </p>
                  <Button 
                    onClick={() => setActiveTab("items")} 
                    variant="outline" 
                    className="w-full"
                  >
                    물품 관리로 이동
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>시스템 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">서버 상태</span>
                  <Badge className="bg-green-100 text-green-800">정상</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">데이터베이스</span>
                  <Badge className="bg-green-100 text-green-800">연결됨</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">마지막 백업</span>
                  <span className="text-sm text-muted-foreground">2시간 전</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">버전</span>
                  <span className="text-sm text-muted-foreground">v1.0.0</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}