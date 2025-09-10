import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { COUNTRIES } from "@/lib/countries";
import { z } from "zod";

// 대학교 입력 단계별 스키마
const schoolSchema = z.object({
  school: z.string().optional(),
});

// 국가 선택 단계별 스키마  
const countrySchema = z.object({
  country: z.string().optional(),
});

type RegisterStep = 'school' | 'country';

interface FormData {
  school?: string;
  country?: string;
}

export default function CompleteRegistration() {
  const [currentStep, setCurrentStep] = useState<RegisterStep>('school');
  const [formData, setFormData] = useState<Partial<FormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { login, user } = useAuth();

  const stepOrder: RegisterStep[] = ['school', 'country'];
  const currentStepIndex = stepOrder.indexOf(currentStep);
  const isLastStep = currentStepIndex === stepOrder.length - 1;

  // 각 단계별 폼 설정
  const schoolForm = useForm({
    resolver: zodResolver(schoolSchema),
    defaultValues: { school: formData.school || "" },
    mode: "onChange"
  });

  const countryForm = useForm({
    resolver: zodResolver(countrySchema),
    defaultValues: { country: formData.country || "" },
    mode: "onChange"
  });

  // 단계별 폼 초기화
  useEffect(() => {
    switch (currentStep) {
      case 'school':
        schoolForm.reset({ school: formData.school || "" });
        break;
      case 'country':
        countryForm.reset({ country: formData.country || "" });
        break;
    }
  }, [currentStep]);

  // Handle OAuth callback parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userStr = urlParams.get('user');
    
    if (token && userStr) {
      try {
        const userData = JSON.parse(decodeURIComponent(userStr));
        login(token, userData);
        
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('OAuth callback error:', error);
        navigate('/auth/login');
      }
    } else if (!user) {
      // If no OAuth data and no existing user, redirect to login
      navigate('/auth/login');
    }
  }, [login, navigate, user]);

  const handleNext = async (data: any) => {
    // 현재 단계 데이터만 저장
    const newData = { ...formData };
    
    switch (currentStep) {
      case 'school':
        newData.school = data.school;
        break;
      case 'country':
        newData.country = data.country;
        break;
    }
    
    setFormData(newData);
    
    if (isLastStep) {
      await handleSubmit(newData);
    } else {
      setCurrentStep(stepOrder[currentStepIndex + 1]);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(stepOrder[currentStepIndex - 1]);
    } else {
      navigate('/auth/login');
    }
  };

  const handleSkip = () => {
    if (!isLastStep) {
      setCurrentStep(stepOrder[currentStepIndex + 1]);
    } else {
      handleSubmit(formData);
    }
  };

  const handleSubmit = async (finalFormData?: Partial<FormData>) => {
    if (!user) {
      toast({
        title: "오류",
        description: "사용자 정보를 찾을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    const submitData = finalFormData || formData;
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/complete-oauth-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          school: submitData.school || "",
          country: submitData.country || "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '회원가입 완료에 실패했습니다.');
      }

      const updatedUser = await response.json();
      
      // Update user in auth context
      login(localStorage.getItem('token')!, updatedUser.user);
      
      navigate('/');
    } catch (error: any) {
      toast({
        title: "회원가입 완료 실패",
        description: error.message || "다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'school': return '학교 입력';
      case 'country': return '국가 선택';
      default: return '';
    }
  };

  const getStepLabel = () => {
    switch (currentStep) {
      case 'school': return '학교/대학교';
      case 'country': return '거주 국가';
      default: return '';
    }
  };

  const getStepPlaceholder = () => {
    switch (currentStep) {
      case 'school': return '예: 서울대학교, Seoul National University';
      case 'country': return '국가를 선택하세요';
      default: return '';
    }
  };

  const getCurrentForm = () => {
    switch (currentStep) {
      case 'school':
        return (
          <Form {...schoolForm}>
            <form onSubmit={schoolForm.handleSubmit(handleNext)} className="space-y-8">
              <FormField
                control={schoolForm.control}
                name="school"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-blue-500 font-medium">{getStepLabel()}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={getStepPlaceholder()}
                        {...field}
                        className="border-2 border-blue-200 rounded-xl p-4 text-base focus:border-blue-500 focus:ring-0"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-500">
                      현재 다니고 있는 학교나 대학교를 입력해주세요 (선택사항)
                    </p>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );

      case 'country':
        return (
          <Form {...countryForm}>
            <form onSubmit={countryForm.handleSubmit(handleNext)} className="space-y-8">
              <FormField
                control={countryForm.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-blue-500 font-medium">{getStepLabel()}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-2 border-blue-200 rounded-xl p-4 text-base focus:border-blue-500 focus:ring-0">
                          <SelectValue placeholder={getStepPlaceholder()} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    <p className="text-xs text-gray-500">
                      현재 거주하고 있는 국가를 선택해주세요 (선택사항)
                    </p>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );

      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-sm font-medium text-gray-700">{getStepTitle()}</h1>
        <div className="w-8"></div>
      </div>

      {/* 진행률 표시 */}
      <div className="px-6 py-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-500">{currentStepIndex + 1}/{stepOrder.length}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div 
            className="bg-blue-500 h-1 rounded-full transition-all duration-300" 
            style={{ width: `${((currentStepIndex + 1) / stepOrder.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            환영합니다, {user.fullName}님!
          </h2>
          <p className="text-gray-600">
            거래를 시작하기 위해 추가 정보를 입력해주세요.
          </p>
        </div>

        {getCurrentForm()}

        {/* 버튼 영역 */}
        <div className="mt-8 space-y-3">
          <Button
            type="submit"
            disabled={isLoading}
            onClick={() => {
              const currentForm = currentStep === 'school' ? schoolForm : countryForm;
              currentForm.handleSubmit(handleNext)();
            }}
            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white text-base font-medium rounded-xl flex items-center justify-center gap-2"
          >
            {isLoading ? (
              "처리 중..."
            ) : isLastStep ? (
              <>
                회원가입 완료
                <ChevronRight className="w-5 h-5" />
              </>
            ) : (
              <>
                다음
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            className="w-full h-12 text-gray-600 hover:text-gray-900 text-base"
          >
            건너뛰기
          </Button>
        </div>
      </div>
    </div>
  );
}