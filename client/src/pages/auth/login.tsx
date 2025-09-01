import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Mail, ArrowLeft } from "lucide-react";
// import logoImage from "@assets/교환마켓 로고-Photoroom_1756705462862.png";
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
  email: z.string().min(1, "이메일 또는 닉네임을 입력하세요"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});

export default function Login() {
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
    } catch (error) {
      toast({
        variant: "destructive",
        title: "로그인 실패",
        description: "이메일 또는 닉네임, 비밀번호를 확인해주세요.",
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
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-medium text-gray-900">회원가입 및 로그인</h1>
        <div className="w-8"></div> {/* 균형을 위한 빈 공간 */}
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6">
        {/* 로고 */}
        <div className="mb-20">
          <div className="w-48 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg">
            <h1 className="text-white text-3xl font-bold tracking-wide">교환마켓</h1>
          </div>
        </div>

        {/* SNS 로그인 안내 텍스트 */}
        <p className="text-gray-600 text-center mb-8 text-base">
          SNS계정으로 간편하게 시작하세요
        </p>

        {/* 로그인 버튼들 */}
        <div className="w-full max-w-sm space-y-4">
          {/* 카카오 로그인 버튼 */}
          <Button 
            onClick={() => {
              toast({
                title: "준비 중",
                description: "카카오 로그인 기능은 현재 준비 중입니다.",
                variant: "default",
              });
            }}
            className="w-full h-14 bg-[#FEE500] hover:bg-[#FADA0C] text-black text-base font-medium rounded-xl flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z"/>
            </svg>
            카카오로 시작하기
          </Button>

          {/* 구글 로그인 버튼 - 비활성화 상태 */}
          <div className="relative">
            <Button 
              disabled
              className="w-full h-14 bg-gray-300 text-gray-500 text-base font-medium rounded-xl flex items-center justify-center gap-3 cursor-not-allowed"
            >
              <svg className="w-6 h-6 opacity-50" viewBox="0 0 24 24">
                <path fill="#9CA3AF" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#9CA3AF" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#9CA3AF" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#9CA3AF" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              구글로 시작하기
            </Button>
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-75">
              서비스 준비중입니다
            </div>
          </div>

          {/* 네이버 로그인 버튼 - 비활성화 상태 */}
          <div className="relative">
            <Button 
              disabled
              className="w-full h-14 bg-gray-300 text-gray-500 text-base font-medium rounded-xl flex items-center justify-center gap-3 cursor-not-allowed"
            >
              <svg className="w-6 h-6 opacity-50" viewBox="0 0 24 24">
                <path fill="#9CA3AF" d="M16.273 12.845 7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z"/>
              </svg>
              네이버로 시작하기
            </Button>
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-75">
              서비스 준비중입니다
            </div>
          </div>

          {/* 이메일 로그인 버튼 */}
          <Button 
            onClick={() => navigate('/auth/email-login')}
            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white text-base font-medium rounded-xl flex items-center justify-center gap-3"
          >
            <Mail className="w-6 h-6" />
            이메일로 시작하기
          </Button>
        </div>

        {/* 하단 텍스트 */}
        <div className="mt-12 text-center space-y-3">
          <p className="text-gray-500 text-sm">
            계정이 없으신가요?
          </p>
          <Button
            variant="link"
            className="p-0 text-gray-600 text-sm underline"
            onClick={() => navigate("/auth/register")}
          >
            회원가입하기
          </Button>
        </div>
      </div>
    </div>
  );
}
