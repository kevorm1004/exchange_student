import { User, Settings, Heart, MessageSquare, Package, Star, LogOut, Edit } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function MyPage() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  // Fetch user statistics
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["/api/users/stats"],
    enabled: !!user,
  });

  if (!user) {
    navigate("/auth/login");
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/auth/login");
    } catch (error) {
      toast({
        title: "로그아웃 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="flex items-center space-x-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={user.profileImage || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xl">
              {user.fullName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">{user.fullName}</h1>
            <p className="text-gray-600">{user.email}</p>
            <p className="text-sm text-gray-500">{user.school} • {user.country}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/profile")}
          >
            <Edit className="w-4 h-4 mr-2" />
            편집
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 활동 통계 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">활동 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {isStatsLoading ? "..." : stats?.sellingStat || 0}
                </div>
                <div className="text-sm text-gray-600">판매중</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {isStatsLoading ? "..." : stats?.soldStat || 0}
                </div>
                <div className="text-sm text-gray-600">판매완료</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {isStatsLoading ? "..." : stats?.purchasedStat || 0}
                </div>
                <div className="text-sm text-gray-600">구매완료</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 메뉴 */}
        <Card>
          <CardContent className="p-0">
            <div className="space-y-0">
              <MenuItem
                icon={Package}
                title="내 상품 관리"
                description="판매중인 상품과 거래 내역"
                onClick={() => navigate("/my/items")}
              />
              <MenuItem
                icon={Heart}
                title="관심 상품"
                description="찜한 상품 목록"
                onClick={() => navigate("/my/favorites")}
              />
              <MenuItem
                icon={MessageSquare}
                title="채팅 내역"
                description="구매자/판매자와의 대화"
                onClick={() => navigate("/chat")}
              />
              <MenuItem
                icon={Star}
                title="리뷰 관리"
                description="받은 리뷰와 작성한 리뷰"
                onClick={() => navigate("/my/reviews")}
              />
            </div>
          </CardContent>
        </Card>

        {/* 설정 */}
        <Card>
          <CardContent className="p-0">
            <div className="space-y-0">
              <MenuItem
                icon={Settings}
                title="설정"
                description="알림, 계정 설정"
                onClick={() => navigate("/settings")}
              />
              <MenuItem
                icon={LogOut}
                title="로그아웃"
                description="계정에서 로그아웃"
                onClick={handleLogout}
                isLast
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface MenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
  isLast?: boolean;
}

function MenuItem({ icon: Icon, title, description, onClick, isLast }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-4 p-4 text-left hover:bg-gray-50 transition-colors ${
        !isLast ? "border-b border-gray-100" : ""
      }`}
    >
      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
        <Icon className="w-5 h-5 text-gray-600" />
      </div>
      <div className="flex-1">
        <div className="font-medium text-gray-900">{title}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
      <div className="text-gray-400">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}