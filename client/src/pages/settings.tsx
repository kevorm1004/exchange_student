import { useState } from "react";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  User, 
  Bell, 
  Shield, 
  Globe, 
  Moon, 
  Sun, 
  ChevronRight, 
  LogOut,
  Trash2,
  Mail,
  Phone,
  MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    chat: true,
    marketing: false,
  });
  const [language, setLanguage] = useState("ko");
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.username || "",
    email: user?.email || "",
    phone: "",
    bio: "",
    location: "",
  });

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "로그아웃되었습니다",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "로그아웃 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await apiRequest("DELETE", "/api/user/account");
      toast({
        title: "계정이 삭제되었습니다",
        variant: "default",
      });
      await logout();
    } catch (error) {
      toast({
        title: "계정 삭제 실패",
        description: "문제가 발생했습니다. 고객센터에 문의해주세요.",
        variant: "destructive",
      });
    }
  };

  const handleProfileUpdate = async () => {
    try {
      await apiRequest("PUT", "/api/user/profile", profileData);
      toast({
        title: "프로필이 업데이트되었습니다",
        variant: "default",
      });
      setShowProfileEdit(false);
    } catch (error) {
      toast({
        title: "프로필 업데이트 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    }
  };

  const handleNotificationUpdate = async (key: string, value: boolean) => {
    try {
      const newNotifications = { ...notifications, [key]: value };
      setNotifications(newNotifications);
      await apiRequest("PUT", "/api/user/notifications", newNotifications);
      toast({
        title: "알림 설정이 변경되었습니다",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "설정 변경 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-md mx-auto flex items-center">
          <Link to="/my">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold ml-3">설정</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* 계정 정보 */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            계정 정보
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">{user?.username || "닉네임"}</div>
                <div className="text-sm text-gray-500">{user?.email || "이메일 없음"}</div>
              </div>
              <Dialog open={showProfileEdit} onOpenChange={setShowProfileEdit}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>프로필 편집</DialogTitle>
                    <DialogDescription>
                      프로필 정보를 수정할 수 있습니다.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">이름</Label>
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">이메일</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">전화번호</Label>
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="location">위치</Label>
                      <Input
                        id="location"
                        value={profileData.location}
                        onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="bio">소개</Label>
                      <Textarea
                        id="bio"
                        value={profileData.bio}
                        onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="자기소개를 작성해주세요"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowProfileEdit(false)}>
                      취소
                    </Button>
                    <Button onClick={handleProfileUpdate}>
                      저장
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </Card>

        {/* 알림 설정 */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            알림 설정
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="push-notifications">푸시 알림</Label>
              <Switch
                id="push-notifications"
                checked={notifications.push}
                onCheckedChange={(checked) => handleNotificationUpdate("push", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notifications">이메일 알림</Label>
              <Switch
                id="email-notifications"
                checked={notifications.email}
                onCheckedChange={(checked) => handleNotificationUpdate("email", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="chat-notifications">채팅 알림</Label>
              <Switch
                id="chat-notifications"
                checked={notifications.chat}
                onCheckedChange={(checked) => handleNotificationUpdate("chat", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="marketing-notifications">마케팅 알림</Label>
              <Switch
                id="marketing-notifications"
                checked={notifications.marketing}
                onCheckedChange={(checked) => handleNotificationUpdate("marketing", checked)}
              />
            </div>
          </div>
        </Card>

        {/* 앱 설정 */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            앱 설정
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode">다크 모드</Label>
              <Switch
                id="dark-mode"
                checked={isDarkMode}
                onCheckedChange={setIsDarkMode}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="language">언어</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ko">한국어</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* 보안 및 개인정보 */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            보안 및 개인정보
          </h3>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Shield className="w-4 h-4 mr-2" />
              비밀번호 변경
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Shield className="w-4 h-4 mr-2" />
              2단계 인증
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Shield className="w-4 h-4 mr-2" />
              개인정보 처리방침
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Button>
          </div>
        </Card>

        {/* 기타 */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">기타</h3>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              고객센터
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Button>
            <Button variant="outline" className="w-full justify-start">
              서비스 이용약관
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Button>
            <Button variant="outline" className="w-full justify-start">
              앱 정보
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Button>
          </div>
        </Card>

        {/* 계정 관리 */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">계정 관리</h3>
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start text-red-600 hover:text-red-700"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </Button>
            
            {/* 작고 잘 안 보이는 회원탈퇴 링크 */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button 
                    className="text-xs text-gray-400 hover:text-gray-500 underline"
                    data-testid="button-delete-account"
                  >
                    회원탈퇴
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>정말로 회원탈퇴를 하시겠습니까?</AlertDialogTitle>
                    <AlertDialogDescription>
                      이 작업은 되돌릴 수 없습니다. 모든 데이터가 영구적으로 삭제되며, 
                      등록된 상품, 채팅 내역, 리뷰 등이 모두 사라집니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      회원탈퇴
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}