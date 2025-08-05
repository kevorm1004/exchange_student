import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { authApi } from "@/lib/auth";
import { type LoginData } from "@shared/schema";
import { z } from "zod";

// Custom login schema for client that doesn't require email format
const clientLoginSchema = z.object({
  email: z.string().min(1, "이메일 또는 사용자명을 입력하세요"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});

export default function EmailLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();

  const form = useForm<LoginData>({
    resolver: zodResolver(clientLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginData) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(data);
      login(response.token, response.user);
      toast({
        title: "로그인 성공",
        description: "환영합니다!",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "로그인 실패",
        description: error.message || "이메일 또는 비밀번호를 확인해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex items-center p-4">
      <Card className="w-full border-0 shadow-none">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/auth/login')}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            이메일 로그인
          </CardTitle>
          <p className="text-gray-600">이메일과 비밀번호를 입력하세요</p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일 또는 사용자명</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="이메일 또는 사용자명을 입력하세요"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비밀번호</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="비밀번호를 입력하세요"
                          type={showPassword ? "text" : "password"}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full marketplace-button-primary"
                disabled={isLoading}
              >
                {isLoading ? "로그인 중..." : "로그인"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              계정이 없으시나요?{" "}
              <Button
                variant="link"
                className="p-0 h-auto font-normal text-blue-600"
                onClick={() => navigate('/auth/register')}
              >
                회원가입
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}