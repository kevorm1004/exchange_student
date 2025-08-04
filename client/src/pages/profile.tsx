import { Settings, Heart, Package, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRequireAuth, useAuth } from "@/hooks/use-auth";
import Header from "@/components/layout/header";

export default function Profile() {
  const { user, isLoading } = useRequireAuth();
  const { logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  const menuItems = [
    { icon: Package, label: "내 상품 관리", action: () => {} },
    { icon: Heart, label: "관심 목록", action: () => {} },
    { icon: Settings, label: "설정", action: () => {} },
    { icon: LogOut, label: "로그아웃", action: logout, danger: true },
  ];

  return (
    <>
      <Header title="MY" showSearch={false} showNotifications={false} />
      
      <main className="pb-20 pt-4">
        <div className="px-4">
          {/* Profile Section */}
          <Card className="p-6 mb-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.profileImage || undefined} />
                <AvatarFallback>{user.fullName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{user.fullName}</h2>
                <p className="text-gray-600">@{user.username}</p>
                <p className="text-sm text-gray-500 mt-1">{user.school}</p>
                <p className="text-sm text-gray-500">{user.country}</p>
              </div>
            </div>
          </Card>

          {/* Stats Section */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1">0</div>
              <div className="text-sm text-gray-600">판매중</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-secondary mb-1">0</div>
              <div className="text-sm text-gray-600">거래완료</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-accent mb-1">0</div>
              <div className="text-sm text-gray-600">관심상품</div>
            </Card>
          </div>

          {/* Menu Items */}
          <div className="space-y-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Button
                  key={index}
                  variant="ghost"
                  className={`w-full justify-start h-12 text-left ${
                    item.danger ? "text-red-600 hover:text-red-700 hover:bg-red-50" : ""
                  }`}
                  onClick={item.action}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
