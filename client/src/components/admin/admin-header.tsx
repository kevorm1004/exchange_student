import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import logoImage from "@assets/exchange-market-logo.jpg";

export default function AdminHeader() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/admin");
  };

  const goToMainSite = () => {
    navigate("/");
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img 
            src={logoImage} 
            alt="교환마켓 로고" 
            className="h-10 w-auto"
          />
          <div>
            <h1 className="text-xl font-bold text-gray-900">교환마켓 Admin</h1>
            <p className="text-sm text-gray-600">관리자 대시보드</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{user?.username}</p>
            <p className="text-xs text-gray-600">관리자</p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToMainSite}
          >
            메인 사이트로
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-gray-600 hover:text-red-600"
          >
            <LogOut className="h-4 w-4 mr-2" />
            로그아웃
          </Button>
        </div>
      </div>
    </header>
  );
}