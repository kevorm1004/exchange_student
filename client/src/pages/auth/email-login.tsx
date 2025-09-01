import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { authApi } from "@/lib/auth";
import { type LoginData } from "@shared/schema";
import { z } from "zod";

// Custom login schema for client that doesn't require email format
const clientLoginSchema = z.object({
  email: z.string().min(1, "이메일을 입력하세요"),
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
    <div className="min-h-screen bg-white">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/auth/login')}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-sm font-medium text-gray-700">이메일 로그인</h1>
        <div className="w-8"></div> {/* 균형을 위한 빈 공간 */}
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6">
        {/* 로그인 폼 */}
        <div className="w-full max-w-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">이메일</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="이메일을 입력하세요"
                        className="h-12 border-gray-300 rounded-xl"
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
                    <FormLabel className="text-gray-700 font-medium">비밀번호</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="비밀번호를 입력하세요"
                          type={showPassword ? "text" : "password"}
                          className="h-12 border-gray-300 rounded-xl pr-12"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400" />
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
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white text-base font-medium rounded-xl mt-8"
                disabled={isLoading}
              >
                {isLoading ? "로그인 중..." : "로그인"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}