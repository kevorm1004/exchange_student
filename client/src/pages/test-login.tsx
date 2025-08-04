import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function TestLogin() {
  const [selectedUser, setSelectedUser] = useState("");
  const { toast } = useToast();
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const testUsers = [
    { username: "john_doe", name: "John Doe", info: "Tokyo University, Japan" },
    { username: "sarah_kim", name: "Sarah Kim", info: "Seoul National University, Korea" },
    { username: "mike_chen", name: "Mike Chen", info: "Peking University, China" },
    { username: "emma_brown", name: "Emma Brown", info: "Harvard University, USA" }
  ];

  const loginMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await fetch("/api/auth/test-login", {
        method: "POST",
        body: JSON.stringify({ username }),
        headers: { "Content-Type": "application/json" }
      });
      
      if (!response.ok) {
        throw new Error("Login failed");
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      login(data.token, data.user);
      toast({
        title: "로그인 성공",
        description: `${data.user.fullName}님으로 로그인되었습니다.`
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "로그인 실패",
        description: "사용자를 찾을 수 없습니다.",
        variant: "destructive"
      });
    }
  });

  const handleLogin = () => {
    if (selectedUser) {
      loginMutation.mutate(selectedUser);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">테스트 로그인</CardTitle>
          <p className="text-sm text-gray-600 text-center">
            테스트용 계정으로 빠르게 로그인하세요
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">테스트 사용자 선택</label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="사용자를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {testUsers.map((user) => (
                  <SelectItem key={user.username} value={user.username}>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.info}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleLogin}
            disabled={!selectedUser || loginMutation.isPending}
            className="w-full"
          >
            {loginMutation.isPending ? "로그인 중..." : "로그인"}
          </Button>

          <div className="text-center">
            <Button 
              variant="link" 
              onClick={() => setLocation("/auth/login")}
              className="text-sm"
            >
              일반 로그인으로 돌아가기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}