import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, ArrowLeft, Check, X } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { authApi } from "@/lib/auth";
import { registerSchema, type RegisterData } from "@shared/schema";
import { COUNTRIES } from "@/lib/countries";
import { z } from "zod";

// 각 단계별 스키마
const nameSchema = z.object({
  fullName: z.string().min(1, "이름을 입력해주세요").min(2, "이름은 2글자 이상이어야 합니다"),
});

const usernameSchema = z.object({
  username: z.string().min(1, "사용자명을 입력해주세요").min(3, "사용자명은 3글자 이상이어야 합니다"),
});

const emailSchema = z.object({
  email: z.string().min(1, "이메일을 입력해주세요").email("올바른 이메일 형식이 아닙니다"),
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

type RegisterStep = 'name' | 'username' | 'email' | 'password' | 'school' | 'country';

interface FormData {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  school?: string;
  country?: string;
}

export default function Register() {
  const [currentStep, setCurrentStep] = useState<RegisterStep>('name');
  const [formData, setFormData] = useState<Partial<FormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();

  const stepOrder: RegisterStep[] = ['name', 'username', 'email', 'password', 'school', 'country'];
  const currentStepIndex = stepOrder.indexOf(currentStep);
  const isLastStep = currentStepIndex === stepOrder.length - 1;
  const isOptionalStep = currentStep === 'school' || currentStep === 'country';

  // 각 단계별 폼
  const nameForm = useForm({
    resolver: zodResolver(nameSchema),
    defaultValues: { fullName: formData.fullName || "" }
  });

  const usernameForm = useForm({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username: formData.username || "" }
  });

  const emailForm = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: formData.email || "" }
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { 
      password: formData.password || "",
      confirmPassword: formData.confirmPassword || ""
    }
  });

  const schoolForm = useForm({
    resolver: zodResolver(schoolSchema),
    defaultValues: { school: formData.school || "" }
  });

  const countryForm = useForm({
    resolver: zodResolver(countrySchema),
    defaultValues: { country: formData.country || "" }
  });

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
      // 최종 회원가입 처리
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
        fullName: formData.fullName!,
        username: formData.username!,
        email: formData.email!,
        password: formData.password!,
        confirmPassword: formData.confirmPassword!,
        school: formData.school || "",
        country: formData.country || "",
        profileImage: "",
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
      case 'name': return '이름을 입력해주세요';
      case 'username': return '사용자명을 입력해주세요';
      case 'email': return '이메일을 입력해주세요';
      case 'password': return '비밀번호를 설정해주세요';
      case 'school': return '학교를 입력해주세요 (선택)';
      case 'country': return '국가를 선택해주세요 (선택)';
      default: return '';
    }
  };

  const getCurrentForm = () => {
    switch (currentStep) {
      case 'name':
        return (
          <Form {...nameForm}>
            <form onSubmit={nameForm.handleSubmit(handleNext)} className="space-y-6">
              <FormField
                control={nameForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름 *</FormLabel>
                    <FormControl>
                      <Input placeholder="실명을 입력하세요" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                다음
              </Button>
            </form>
          </Form>
        );

      case 'username':
        return (
          <Form {...usernameForm}>
            <form onSubmit={usernameForm.handleSubmit(handleNext)} className="space-y-6">
              <FormField
                control={usernameForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>사용자명 *</FormLabel>
                    <FormControl>
                      <Input placeholder="다른 사용자들에게 보여질 이름" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                다음
              </Button>
            </form>
          </Form>
        );

      case 'email':
        return (
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(handleNext)} className="space-y-6">
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일 *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="example@email.com"
                          type="email"
                          {...field}
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
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          </div>
                        )}
                        {emailAvailable === true && (
                          <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                        )}
                        {emailAvailable === false && (
                          <X className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
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
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || emailAvailable === false || checkingEmail}
              >
                다음
              </Button>
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
                    <FormLabel>비밀번호 *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="8글자 이상 입력하세요"
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
                    <FormLabel>비밀번호 확인 *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="비밀번호를 다시 입력하세요"
                          type={showConfirmPassword ? "text" : "password"}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
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
              <Button type="submit" className="w-full" disabled={isLoading}>
                다음
              </Button>
            </form>
          </Form>
        );

      case 'school':
        return (
          <Form {...schoolForm}>
            <form onSubmit={schoolForm.handleSubmit(handleNext)} className="space-y-6">
              <FormField
                control={schoolForm.control}
                name="school"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>학교</FormLabel>
                    <FormControl>
                      <Input placeholder="소속 학교를 입력하세요" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-3">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  다음
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleSkip}
                >
                  건너뛰기
                </Button>
              </div>
            </form>
          </Form>
        );

      case 'country':
        return (
          <Form {...countryForm}>
            <form onSubmit={countryForm.handleSubmit(handleNext)} className="space-y-6">
              <FormField
                control={countryForm.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>국가</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="국가를 선택하세요" />
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
              <div className="space-y-3">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "가입 중..." : "회원가입 완료"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleSkip}
                  disabled={isLoading}
                >
                  건너뛰기
                </Button>
              </div>
            </form>
          </Form>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold">
                회원가입
              </CardTitle>
              <p className="text-sm text-gray-500">
                {currentStepIndex + 1} / {stepOrder.length}
              </p>
            </div>
          </div>
          
          {/* 진행 바 */}
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / stepOrder.length) * 100}%` }}
            />
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {getStepTitle()}
            </h2>
            {isOptionalStep && (
              <p className="text-sm text-gray-600">
                이 정보는 나중에 설정할 수 있습니다
              </p>
            )}
          </div>

          {getCurrentForm()}

          {currentStep === 'name' && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                이미 계정이 있으신가요?{" "}
                <Button
                  variant="link"
                  className="p-0 text-primary"
                  onClick={() => navigate("/auth/login")}
                >
                  로그인
                </Button>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}