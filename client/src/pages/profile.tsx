import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, User, Mail, School, MapPin, Camera, Save } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { COUNTRIES } from "@/lib/countries";

// 프로필 업데이트 스키마 (비밀번호 제외)
const updateProfileSchema = insertUserSchema.omit({ password: true }).extend({
  currentPassword: z.string().optional(),
  newPassword: z.string()
    .min(6, "비밀번호는 최소 6자 이상이어야 합니다")
    .optional()
    .or(z.literal("")),
  confirmPassword: z.string().optional().or(z.literal("")),
  preferredCurrency: z.string().default("USD"),
}).refine((data) => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});

type UpdateProfileForm = z.infer<typeof updateProfileSchema>;

// Remove the old countries array as we'll use the shared COUNTRIES constant

export default function Profile() {
  const [, navigate] = useLocation();
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  if (!user) {
    navigate("/auth/login");
    return null;
  }

  const form = useForm<UpdateProfileForm>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      school: user.school,
      country: user.country,
      preferredCurrency: user.preferredCurrency || "USD",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileForm) => {
      const updateData: any = {
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        school: data.school,
        country: data.country,
        preferredCurrency: data.preferredCurrency,
      };
      
      if (data.newPassword) {
        updateData.currentPassword = data.currentPassword;
        updateData.newPassword = data.newPassword;
      }
      
      return apiRequest("PUT", `/api/users/${user.id}`, updateData);
    },
    onSuccess: async (response) => {
      const updatedUser = await response.json();
      
      // 인증 컨텍스트와 로컬 스토리지 모두 업데이트
      updateUser(updatedUser);
      
      // 쿼리 캐시 무효화 (홈 화면 데이터 새로고침)
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      toast({
        title: "프로필 업데이트 완료",
        description: "프로필 정보가 성공적으로 업데이트되었습니다.",
      });
      
      // MY 페이지로 이동
      navigate("/my");
    },
    onError: (error) => {
      console.error('Profile update error:', error);
      toast({
        variant: "destructive",
        title: "프로필 업데이트 실패",
        description: "프로필 업데이트 중 오류가 발생했습니다.",
      });
    },
  });

  const onSubmit = (data: UpdateProfileForm) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/my")}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">프로필 설정</h1>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>내 정보</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* 프로필 이미지 */}
            <div className="flex items-center space-x-4 mb-6">
              <Avatar className="w-20 h-20">
                <AvatarImage src={user.profileImage || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {user.fullName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm">
                <Camera className="w-4 h-4 mr-2" />
                사진 변경
              </Button>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* 기본 정보 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">기본 정보</h3>
                  
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>이름</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="이름을 입력하세요" 
                            {...field}
                            className="bg-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>닉네임</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="닉네임을 입력하세요" 
                            {...field}
                            className="bg-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>이메일</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="이메일을 입력하세요" 
                            {...field}
                            className="bg-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* 위치 정보 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">위치 정보</h3>
                  
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>국가</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white">
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

                  <FormField
                    control={form.control}
                    name="school"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>학교</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="학교명을 입력하세요" 
                            {...field}
                            className="bg-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="preferredCurrency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>선호 통화</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="통화를 선택하세요" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SUPPORTED_CURRENCIES.map((currency) => (
                              <SelectItem key={currency} value={currency}>
                                {currency}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* 비밀번호 변경 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">비밀번호 변경</h3>
                  <p className="text-sm text-gray-600">비밀번호를 변경하려면 아래 필드를 입력하세요.</p>
                  
                  <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>현재 비밀번호</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="현재 비밀번호를 입력하세요" 
                            {...field}
                            className="bg-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>새 비밀번호</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="새 비밀번호를 입력하세요" 
                            {...field}
                            className="bg-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>새 비밀번호 확인</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="새 비밀번호를 다시 입력하세요" 
                            {...field}
                            className="bg-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* 저장 버튼 */}
                <div className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={updateProfileMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateProfileMutation.isPending ? "저장 중..." : "프로필 저장"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}