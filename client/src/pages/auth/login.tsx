import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Mail, ArrowLeft } from "lucide-react";
import logoImage from "@assets/logo_1756706278060.png";
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
import { useEffect } from "react";

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

  // Check for OAuth error in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error === 'deleted_account') {
      toast({
        variant: "destructive",
        title: "로그인 실패",
        description: "삭제된 계정입니다. 새로운 계정으로 회원가입해주세요.",
      });
      // Clear the error parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error === 'auth_failed') {
      toast({
        variant: "destructive",
        title: "로그인 실패",
        description: "소셜 로그인에 실패했습니다. 다시 시도해주세요.",
      });
      // Clear the error parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

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
        <h1 className="text-sm font-medium text-gray-700">회원가입 및 로그인</h1>
        <div className="w-8"></div> {/* 균형을 위한 빈 공간 */}
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6">
        {/* 로고 */}
        <div className="mb-20">
          <img 
            src={logoImage} 
            alt="교환마켓 로고" 
            className="w-64 h-auto"
          />
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
              window.location.href = '/api/auth/kakao';
            }}
            className="w-full h-14 bg-[#FEE500] hover:bg-[#FADA0C] text-black text-base font-medium rounded-xl flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z"/>
            </svg>
            카카오로 시작하기
          </Button>

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
