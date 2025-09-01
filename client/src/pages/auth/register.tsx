import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, ArrowLeft, Check, X } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { authApi } from "@/lib/auth";
import { registerSchema, type RegisterData } from "@shared/schema";
import { COUNTRIES } from "@/lib/countries";
import { z } from "zod";

// 각 단계별 스키마
const emailSchema = z.object({
  email: z.string().min(1, "이메일을 입력해주세요").email("올바른 이메일 형식이 아닙니다"),
});

const usernameSchema = z.object({
  username: z.string().min(1, "사용자명을 입력해주세요").min(3, "사용자명은 3글자 이상이어야 합니다"),
});

const passwordSchema = z.object({
  password: z.string().min(8, "비밀번호는 8글자 이상이어야 합니다"),
  confirmPassword: z.string().min(1, "비밀번호 확인을 입력해주세요"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});

const schoolSchema = z.object({
  school: z.string().optional(),
});

const countrySchema = z.object({
  country: z.string().optional(),
});

type RegisterStep = 'email' | 'username' | 'password' | 'school' | 'country';

interface FormData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  school?: string;
  country?: string;
}

export default function Register() {
  const [currentStep, setCurrentStep] = useState<RegisterStep>('email');
  const [formData, setFormData] = useState<Partial<FormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();

  const stepOrder: RegisterStep[] = ['email', 'username', 'password', 'school', 'country'];
  const currentStepIndex = stepOrder.indexOf(currentStep);
  const isLastStep = currentStepIndex === stepOrder.length - 1;
  const isOptionalStep = currentStep === 'school' || currentStep === 'country';

  // 각 단계별 폼
  const emailForm = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: formData.email || "" },
    mode: "onChange"
  });

  const usernameForm = useForm({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username: formData.username || "" },
    mode: "onChange"
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { 
      password: formData.password || "",
      confirmPassword: formData.confirmPassword || ""
    },
    mode: "onChange"
  });

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

  // 각 단계별 유효성 검사 함수
  const isStepValid = () => {
    switch (currentStep) {
      case 'email':
        return emailForm.formState.isValid && emailAvailable === true && !checkingEmail;
      case 'username':
        return usernameForm.formState.isValid;
      case 'password':
        return passwordForm.formState.isValid;
      case 'school':
        return true; // 선택사항이므로 항상 유효
      case 'country':
        return true; // 선택사항이므로 항상 유효
      default:
        return false;
    }
  };

  // 이메일 중복 확인
  const checkEmailAvailability = async (email: string) => {
    if (!email || !emailSchema.safeParse({ email }).success) return;
    
    setCheckingEmail(true);
    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      setEmailAvailable(data.available);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "확인 실패",
        description: "이메일 중복 확인에 실패했습니다.",
      });
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleNext = async (data: any) => {
    setFormData(prev => ({ ...prev, ...data }));
    
    if (isLastStep) {
      await handleSubmit();
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
    if (isOptionalStep && !isLastStep) {
      setCurrentStep(stepOrder[currentStepIndex + 1]);
    } else if (isLastStep) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const finalData: RegisterData = {
        fullName: formData.username || "", // username을 fullName으로도 사용
        username: formData.username!,
        email: formData.email!,
        password: formData.password!,
        confirmPassword: formData.confirmPassword!,
        school: formData.school || "",
        country: formData.country || "",
        profileImage: "",
        preferredCurrency: "USD",
        role: "user",
        status: "active",
        authProvider: "email",
        googleId: null,
        kakaoId: null,
        naverId: null,
      };

      const response = await authApi.register(finalData);
      login(response.token, response.user);
      toast({
        title: "회원가입 성공",
        description: "ExchangeMart에 오신 것을 환영합니다!",
      });
      navigate('/');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "회원가입 실패",
        description: "입력 정보를 확인해주세요.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'email': return '이메일 입력';
      case 'username': return '아이디 입력';
      case 'password': return '비밀번호 설정';
      case 'school': return '학교 입력';
      case 'country': return '국가 선택';
      default: return '';
    }
  };

  const getStepLabel = () => {
    switch (currentStep) {
      case 'email': return '이메일';
      case 'username': return '아이디';
      case 'password': return '비밀번호';
      case 'school': return '학교';
      case 'country': return '국가';
      default: return '';
    }
  };

  const getStepPlaceholder = () => {
    switch (currentStep) {
      case 'email': return 'example@email.com';
      case 'username': return '아이디를 입력해주세요';
      case 'password': return '8글자 이상 입력하세요';
      case 'school': return '학교명을 입력해주세요';
      case 'country': return '국가를 선택해주세요';
      default: return '';
    }
  };

  const getCurrentForm = () => {
    switch (currentStep) {
      case 'email':
        return (
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(handleNext)} className="space-y-8">
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-blue-500 font-medium">{getStepLabel()}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder={getStepPlaceholder()}
                          type="email"
                          {...field}
                          className="border-2 border-blue-200 rounded-xl p-4 text-base focus:border-blue-500 focus:ring-0 pr-12"
                          onChange={(e) => {
                            field.onChange(e);
                            setEmailAvailable(null);
                          }}
                          onBlur={(e) => {
                            field.onBlur(e);
                            if (e.target.value) {
                              checkEmailAvailability(e.target.value);
                            }
                          }}
                        />
                        {checkingEmail && (
                          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                          </div>
                        )}
                        {emailAvailable === true && (
                          <Check className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                        )}
                        {emailAvailable === false && (
                          <X className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                    {emailAvailable === false && (
                      <p className="text-sm text-red-500">이미 사용 중인 이메일입니다</p>
                    )}
                    {emailAvailable === true && (
                      <p className="text-sm text-green-500">사용 가능한 이메일입니다</p>
                    )}
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );

      case 'username':
        return (
          <Form {...usernameForm}>
            <form onSubmit={usernameForm.handleSubmit(handleNext)} className="space-y-8">
              <FormField
                control={usernameForm.control}
                name="username"
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
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );

      case 'password':
        return (
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(handleNext)} className="space-y-6">
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-blue-500 font-medium">{getStepLabel()}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder={getStepPlaceholder()}
                          type={showPassword ? "text" : "password"}
                          {...field}
                          className="border-2 border-blue-200 rounded-xl p-4 text-base focus:border-blue-500 focus:ring-0 pr-12"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-blue-500 font-medium">비밀번호 확인</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="비밀번호를 다시 입력하세요"
                          type={showConfirmPassword ? "text" : "password"}
                          {...field}
                          className="border-2 border-blue-200 rounded-xl p-4 text-base focus:border-blue-500 focus:ring-0 pr-12"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );

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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="p-2 mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 px-6 py-8">
        <div className="mb-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {getStepTitle()}
          </h1>
          {isOptionalStep && (
            <p className="text-gray-600">
              선택 사항입니다. 나중에 설정할 수 있어요.
            </p>
          )}
        </div>

        {getCurrentForm()}
      </div>

      {/* 하단 고정 영역 */}
      <div className="bg-white border-t border-gray-200 p-6 space-y-4">
        {/* 다음/완료 버튼 */}
        <Button 
          onClick={() => {
            const currentForm = currentStep === 'email' ? emailForm :
                               currentStep === 'username' ? usernameForm :
                               currentStep === 'password' ? passwordForm :
                               currentStep === 'school' ? schoolForm : countryForm;
            currentForm.handleSubmit(handleNext)();
          }}
          className={`w-full rounded-xl py-4 text-base font-medium transition-colors ${
            isStepValid() && !isLoading
              ? "bg-blue-500 hover:bg-blue-600 text-white"
              : "bg-gray-400 hover:bg-gray-500 text-white"
          }`}
          disabled={isLoading || (currentStep === 'email' && (emailAvailable === false || checkingEmail))}
        >
          {isLoading ? "처리 중..." : isLastStep ? "회원가입 완료" : "다음"}
        </Button>

        {/* 건너뛰기 버튼 (선택 단계에서만) */}
        {isOptionalStep && (
          <Button 
            variant="ghost"
            onClick={handleSkip}
            className="w-full text-gray-500 py-4 text-base"
            disabled={isLoading}
          >
            건너뛰기
          </Button>
        )}

        {/* 진행 표시줄 */}
        <div className="flex justify-center">
          <div className="w-12 h-1 bg-black rounded-full" />
        </div>
      </div>
    </div>
  );
}