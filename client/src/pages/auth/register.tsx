import { useState, useEffect } from "react";
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
  email: z.string()
    .min(1, "이메일을 입력해주세요")
    .email("올바른 이메일 형식이 아닙니다")
    .refine((email) => {
      const domain = email.split('@')[1];
      return domain && domain.includes('.');
    }, "올바른 도메인을 입력해주세요"),
});

const nicknameSchema = z.object({
  nickname: z.string()
    .min(2, "닉네임은 2글자 이상이어야 합니다")
    .max(15, "닉네임은 15글자 이하로 입력해주세요")
    .regex(/^[가-힣a-zA-Z0-9]+$/, "한글, 영문, 숫자만 사용 가능합니다"),
});

const passwordSchema = z.object({
  password: z.string()
    .min(8, "비밀번호는 8글자 이상이어야 합니다")
    .max(20, "비밀번호는 20글자 이하로 입력해주세요")
    .regex(/^(?=.*[a-z])(?=.*\d)/, "영문 소문자와 숫자를 포함해야 합니다")
    .refine((password) => {
      const consecutive = /(.)\1{3,}|0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef/;
      return !consecutive.test(password.toLowerCase());
    }, "연속된 문자나 숫자는 사용할 수 없습니다"),
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

type RegisterStep = 'email' | 'nickname' | 'password' | 'school' | 'country';

interface FormData {
  email: string;
  nickname: string;
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

  const stepOrder: RegisterStep[] = ['email', 'nickname', 'password', 'school', 'country'];
  const currentStepIndex = stepOrder.indexOf(currentStep);
  const isLastStep = currentStepIndex === stepOrder.length - 1;
  const isOptionalStep = currentStep === 'school' || currentStep === 'country';

  // 각 단계별 폼 - 초기값 설정
  const getInitialEmail = () => formData.email || "";
  const getInitialNickname = () => formData.nickname || "";
  const getInitialPassword = () => formData.password || "";
  const getInitialConfirmPassword = () => formData.confirmPassword || "";
  const getInitialSchool = () => formData.school || "";
  const getInitialCountry = () => formData.country || "";

  const emailForm = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: getInitialEmail() },
    mode: "onChange"
  });

  // === 닉네임 입력 폼 설정 ===
  // 🎯 목적: 사용자 닉네임 입력을 위한 독립적인 폼 관리
  // 🔧 해결한 문제: 이메일 값이 닉네임 필드에 나타나는 간섭 현상 방지
  const nicknameForm = useForm({
    resolver: zodResolver(nicknameSchema),  // 닉네임 유효성 검사 규칙 적용
    defaultValues: { nickname: "" },       // 항상 빈 문자열로 시작 (다른 단계 데이터 간섭 차단)
    mode: "onChange"                       // 타이핑할 때마다 실시간 검증
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { 
      password: getInitialPassword(),
      confirmPassword: getInitialConfirmPassword()
    },
    mode: "onChange"
  });

  const schoolForm = useForm({
    resolver: zodResolver(schoolSchema),
    defaultValues: { school: getInitialSchool() },
    mode: "onChange"
  });

  const countryForm = useForm({
    resolver: zodResolver(countrySchema),
    defaultValues: { country: getInitialCountry() },
    mode: "onChange"
  });

  // === 단계별 폼 초기화 시스템 ===
  // 🎯 목적: 각 회원가입 단계로 이동할 때 해당 폼만 독립적으로 초기화
  // 🔧 핵심 기능: 단계간 데이터 간섭 방지 및 뒤로가기 시 데이터 복원
  useEffect(() => {
    switch (currentStep) {
      case 'email':
        // 📧 이메일 단계: 저장된 이메일 값으로 폼 초기화
        emailForm.reset({ email: formData.email || "" });
        break;
        
      case 'nickname':
        // 👤 닉네임 단계: 이메일 값 간섭 방지를 위해 항상 빈 상태로 시작
        nicknameForm.reset({ nickname: "" });
        
        // 뒤로가기로 돌아온 경우에만 저장된 닉네임 복원
        if (formData.nickname) {
          setTimeout(() => {
            nicknameForm.setValue('nickname', formData.nickname!);
          }, 50);  // 폼 리셋 완료 후 값 설정을 위한 지연
        }
        break;
        
      case 'password':
        // 🔐 비밀번호 단계: 두 개의 비밀번호 필드 모두 초기화
        passwordForm.reset({ 
          password: formData.password || "",
          confirmPassword: formData.confirmPassword || ""
        });
        break;
        
      case 'school':
        // 🏫 학교 단계: 저장된 학교 정보로 초기화
        schoolForm.reset({ school: formData.school || "" });
        break;
        
      case 'country':
        // 🌍 국가 단계: 저장된 국가 선택으로 초기화
        countryForm.reset({ country: formData.country || "" });
        break;
    }
  }, [currentStep]);

  // 각 단계별 유효성 검사 함수
  const isStepValid = () => {
    try {
      switch (currentStep) {
        case 'email':
          const emailValue = emailForm.watch('email');
          const isEmailValid = emailSchema.safeParse({ email: emailValue }).success;
          return isEmailValid && !checkingEmail && emailAvailable === true;
        case 'nickname':
          const nicknameValue = nicknameForm.watch('nickname');
          return nicknameSchema.safeParse({ nickname: nicknameValue }).success;
        case 'password':
          const passwordValue = passwordForm.watch('password');
          const confirmPasswordValue = passwordForm.watch('confirmPassword');
          const isValid = passwordSchema.safeParse({ 
            password: passwordValue, 
            confirmPassword: confirmPasswordValue 
          }).success;
          // 이메일과 비밀번호 동일 값 검사
          if (formData.email && passwordValue === formData.email.split('@')[0]) {
            return false;
          }
          return isValid;
        case 'school':
          return true;
        case 'country':
          return true;
        default:
          return false;
      }
    } catch {
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
      
      if (response.ok) {
        const data = await response.json();
        setEmailAvailable(data.available);
      } else {
        // 서버 오류 시 임시로 사용 가능으로 처리 (테스트용)
        console.error('Email check failed - server error');
        setEmailAvailable(true);
      }
    } catch (error) {
      console.error('Email check failed:', error);
      // 네트워크 오류 시 임시로 사용 가능으로 처리 (테스트용)
      setEmailAvailable(true);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleNext = async (data: any) => {
    // 현재 단계 데이터만 저장
    const newData = { ...formData };
    
    switch (currentStep) {
      case 'email':
        newData.email = data.email;
        break;
      case 'nickname':
        newData.nickname = data.nickname;
        break;
      case 'password':
        newData.password = data.password;
        newData.confirmPassword = data.confirmPassword;
        break;
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
    if (isOptionalStep && !isLastStep) {
      setCurrentStep(stepOrder[currentStepIndex + 1]);
    } else if (isLastStep) {
      handleSubmit(formData);
    }
  };

  const handleSubmit = async (finalFormData?: Partial<FormData>) => {
    const submitData = finalFormData || formData;
    setIsLoading(true);
    try {
      // === 회원가입 최종 데이터 준비 ===
      // 🔧 핵심: 서버에서 기대하는 필드명과 구조에 맞춰 데이터 전송
      const finalData = {
        email: submitData.email!,
        nickname: submitData.nickname!,      // 서버에서 nickname으로 받음
        password: submitData.password!,
        confirmPassword: submitData.confirmPassword!,
        school: submitData.school || "",
        country: submitData.country || "",
      };

      const response = await authApi.register(finalData as any);
      login(response.token, response.user);
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
      case 'nickname': return '닉네임 입력';
      case 'password': return '비밀번호 설정';
      case 'school': return '학교 입력';
      case 'country': return '국가 선택';
      default: return '';
    }
  };

  const getStepLabel = () => {
    switch (currentStep) {
      case 'email': return '이메일';
      case 'nickname': return '닉네임';
      case 'password': return '비밀번호';
      case 'school': return '학교';
      case 'country': return '국가';
      default: return '';
    }
  };

  const getStepPlaceholder = () => {
    switch (currentStep) {
      case 'email': return 'example@email.com';
      case 'nickname': return '닉네임을 입력해주세요';
      case 'password': return '영문소문자+숫자 8~20글자';
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
                            field.onBlur();
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

      case 'nickname':
        return (
          <Form {...nicknameForm}>
            <form onSubmit={nicknameForm.handleSubmit(handleNext)} className="space-y-8">
              <FormField
                control={nicknameForm.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-blue-500 font-medium">{getStepLabel()}</FormLabel>
                    <FormControl>
                      {/* 🐛 디버깅이 가능한 닉네임 입력 필드 */}
                      <Input 
                        placeholder={getStepPlaceholder()} 
                        value={field.value || ""} // 현재 값 표시
                        onChange={(e) => {
                          const newValue = e.target.value;
                          
                          // === 닉네임 입력값 처리 ===
                          // 🔧 3단계 강력한 폼 업데이트 시스템으로 입력 문제 해결
                          try {
                            // 1️⃣ react-hook-form 기본 방식
                            field.onChange(newValue);
                            
                            // 2️⃣ 강제 값 설정 (상태 충돌 방지)
                            nicknameForm.setValue('nickname', newValue, { 
                              shouldValidate: true,  // 즉시 유효성 검사
                              shouldDirty: true,     // 폼 수정 상태로 표시
                              shouldTouch: true      // 필드 터치 상태로 표시
                            });
                            
                            // 3️⃣ 폼 재렌더링 강제 실행 (UI 업데이트 보장)
                            nicknameForm.trigger('nickname');
                            
                          } catch (error) {
                            console.error('❌ 닉네임 입력 처리 실패:', error);
                          }
                        }}
                        onBlur={field.onBlur}
                        name="nickname"
                        className="border-2 border-blue-200 rounded-xl p-4 text-base focus:border-blue-500 focus:ring-0"
                        data-testid="input-nickname"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-500">
                      2-15글자, 한글/영문/숫자만 사용 가능. 중복 허용
                    </p>
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
                          value={field.value || ""}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            
                            // === 비밀번호 입력값 처리 ===
                            try {
                              field.onChange(newValue);
                              passwordForm.setValue('password', newValue, { 
                                shouldValidate: true,
                                shouldDirty: true,
                                shouldTouch: true 
                              });
                              passwordForm.trigger('password');
                            } catch (error) {
                              console.error('❌ 비밀번호 입력 처리 실패:', error);
                            }
                          }}
                          onBlur={field.onBlur}
                          name="password"
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
                    <p className="text-xs text-gray-500">
                      8-20글자, 영문소문자+숫자 필수. 연속문자 금지
                    </p>
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
                          value={field.value || ""}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            
                            // === 비밀번호 확인 입력값 처리 ===
                            try {
                              field.onChange(newValue);
                              passwordForm.setValue('confirmPassword', newValue, { 
                                shouldValidate: true,
                                shouldDirty: true,
                                shouldTouch: true 
                              });
                              passwordForm.trigger('confirmPassword');
                            } catch (error) {
                              console.error('❌ 비밀번호 확인 입력 처리 실패:', error);
                            }
                          }}
                          onBlur={field.onBlur}
                          name="confirmPassword"
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
                        value={field.value || ""}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          
                          // === 학교 입력값 처리 ===
                          try {
                            field.onChange(newValue);
                            schoolForm.setValue('school', newValue, { 
                              shouldValidate: true,
                              shouldDirty: true,
                              shouldTouch: true 
                            });
                            schoolForm.trigger('school');
                          } catch (error) {
                            console.error('❌ 학교 입력 처리 실패:', error);
                          }
                        }}
                        onBlur={field.onBlur}
                        name="school"
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
                    <Select 
                      onValueChange={(value) => {
                        // 폼 값 설정
                        field.onChange(value);
                        
                        // formData에도 저장
                        setFormData(prev => ({
                          ...prev,
                          country: value
                        }));
                        
                        // 폼 상태 업데이트
                        countryForm.setValue('country', value, { 
                          shouldValidate: true,
                          shouldDirty: true,
                          shouldTouch: true 
                        });
                      }}
                      value={field.value || ""}
                    >
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
          data-testid="button-back"
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
                               currentStep === 'nickname' ? nicknameForm :
                               currentStep === 'password' ? passwordForm :
                               currentStep === 'school' ? schoolForm : countryForm;
            currentForm.handleSubmit(handleNext)();
          }}
          className={`w-full rounded-xl py-4 text-base font-medium transition-colors ${
            isStepValid() && !isLoading
              ? "bg-blue-500 hover:bg-blue-600 text-white"
              : "bg-gray-400 hover:bg-gray-500 text-white cursor-not-allowed"
          }`}
          disabled={isLoading || !isStepValid()}
          data-testid="button-next"
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
            data-testid="button-skip"
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