import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Camera, X, Image as ImageIcon } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { apiRequest } from "@/lib/queryClient";
import { insertCommunityPostSchema, type InsertCommunityPost } from "@shared/schema";
import { COUNTRIES } from "@/lib/countries";
import { z } from "zod";

const createPostSchema = insertCommunityPostSchema.omit({
  id: true,
  authorId: true,
  likes: true,
  views: true,
  commentsCount: true,
  createdAt: true,
}).extend({
  images: z.array(z.string()).max(2, "최대 2장까지만 업로드할 수 있습니다").optional(),
  semester: z.string().optional(),
  openChatLink: z.string().optional(),
});

type CreatePostForm = z.infer<typeof createPostSchema>;

export default function CommunityCreate() {
  const [, navigate] = useLocation();
  const { user } = useRequireAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // URL 파라미터에서 카테고리 읽기
  const urlParams = new URLSearchParams(window.location.search);
  const categoryFromUrl = urlParams.get('category') as "이야기방" | "모임방" | null;

  // Generate semester options based on current date
  const generateSemesterOptions = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 0-based to 1-based
    
    const options = [];
    let startYear = currentYear;
    let startSemester = 1;
    
    // Determine current semester
    if (currentMonth >= 3 && currentMonth <= 6) {
      startSemester = 2; // 2학기
    } else if (currentMonth >= 7 && currentMonth <= 8) {
      startSemester = 3; // 3학기
    } else if (currentMonth >= 9 || currentMonth <= 2) {
      if (currentMonth >= 9) {
        startYear = currentYear + 1;
        startSemester = 1; // 다음년도 1학기
      } else {
        startSemester = 1; // 1학기
      }
    }
    
    // Generate 5 semester options starting from current
    for (let i = 0; i < 5; i++) {
      const year = startYear + Math.floor((startSemester - 1 + i) / 3);
      const semester = ((startSemester - 1 + i) % 3) + 1;
      options.push(`${year % 100}년 ${semester}학기`);
    }
    
    return options;
  };

  const semesterOptions = generateSemesterOptions();

  const form = useForm<CreatePostForm>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      title: "",
      content: "",
      category: categoryFromUrl || "이야기방", // URL 파라미터에서 온 카테고리 사용
      country: user?.country || "",
      school: user?.school || "",
      images: [],
      semester: semesterOptions[0] || "",
      openChatLink: "",
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: CreatePostForm) => {
      console.log("=== 글 작성 시작 ===");
      console.log("Form data:", data);
      console.log("User info:", user);
      console.log("Uploaded images:", uploadedImages);
      
      const postData = {
        title: data.title,
        content: data.content,
        category: data.category,
        country: data.country || user!.country,
        school: data.school || user!.school,
        images: uploadedImages,
        semester: data.category === "모임방" ? data.semester : undefined,
        openChatLink: data.category === "모임방" ? data.openChatLink : undefined,
      };
      console.log("Sending to API:", postData);
      
      try {
        const response = await apiRequest("POST", "/api/community/posts", postData);
        console.log("API response status:", response.status);
        const result = await response.json();
        console.log("API response data:", result);
        return result;
      } catch (error) {
        console.error("API request failed:", error);
        throw error;
      }
    },
    onSuccess: (result) => {
      console.log("=== 글 작성 성공 ===");
      console.log("Created post:", result);
      toast({
        title: "게시글 작성 완료",
        description: "게시글이 성공적으로 작성되었습니다."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      navigate("/community");
    },
    onError: (error: any) => {
      console.error("=== 글 작성 실패 ===");
      console.error("Error object:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      
      let errorMessage = "게시글을 작성하는데 실패했습니다.";
      
      if (error.message) {
        if (error.message.includes("401")) {
          errorMessage = "로그인이 만료되었습니다. 다시 로그인해주세요.";
        } else if (error.message.includes("403")) {
          errorMessage = "권한이 없습니다. 다시 로그인해주세요.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "게시글 작성 실패",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: CreatePostForm) => {
    console.log("=== 폼 제출 ===");
    console.log("Form data:", data);
    console.log("Form errors:", form.formState.errors);
    console.log("Form is valid:", form.formState.isValid);
    console.log("User data:", user);
    console.log("Authentication token exists:", !!localStorage.getItem('token'));
    
    // 필수 필드 검증
    if (!data.title?.trim()) {
      console.log("Title validation failed");
      toast({
        title: "제목을 입력해주세요",
        description: "제목은 필수 항목입니다.",
        variant: "destructive"
      });
      return;
    }
    
    if (!data.content?.trim()) {
      console.log("Content validation failed");
      toast({
        title: "내용을 입력해주세요", 
        description: "내용은 필수 항목입니다.",
        variant: "destructive"
      });
      return;
    }

    if (!data.category) {
      console.log("Category validation failed");
      toast({
        title: "카테고리를 선택해주세요",
        description: "카테고리는 필수 항목입니다.",
        variant: "destructive"
      });
      return;
    }

    if (!data.country?.trim()) {
      console.log("Country validation failed");
      toast({
        title: "국가를 선택해주세요",
        description: "국가는 필수 항목입니다.",
        variant: "destructive"
      });
      return;
    }

    if (!data.school?.trim()) {
      console.log("School validation failed");
      toast({
        title: "학교를 입력해주세요",
        description: "학교는 필수 항목입니다.",
        variant: "destructive"
      });
      return;
    }

    // 모임방 전용 필수 필드 검증
    if (data.category === "모임방") {
      if (!data.semester?.trim()) {
        console.log("Semester validation failed");
        toast({
          title: "학기를 선택해주세요",
          description: "모임방 글에는 학기가 필수입니다.",
          variant: "destructive"
        });
        return;
      }
    }

    console.log("All validations passed, creating post...");
    createPostMutation.mutate(data);
  };

  // Image compression function with progressive compression
  const compressImage = (file: File, maxWidth: number = 600, quality: number = 0.5): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions (smaller for mobile)
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = (width * maxWidth) / height;
            height = maxWidth;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress progressively
        ctx.drawImage(img, 0, 0, width, height);
        
        let currentQuality = quality;
        let compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
        let sizeInBytes = (compressedDataUrl.length * 3) / 4;
        
        // Keep compressing until under 200KB or quality gets too low
        while (sizeInBytes > 200 * 1024 && currentQuality > 0.05) {
          currentQuality *= 0.7;
          compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
          sizeInBytes = (compressedDataUrl.length * 3) / 4;
        }
        
        resolve(compressedDataUrl);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (uploadedImages.length + files.length > 2) {
      toast({
        title: "이미지 업로드 제한",
        description: "최대 2장까지만 업로드할 수 있습니다.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        try {
          toast({
            title: "이미지 처리 중",
            description: "고화질 이미지를 압축하고 있습니다...",
          });
          
          // Compress image before adding to state
          const compressedImage = await compressImage(file);
          setUploadedImages(prev => [...prev, compressedImage]);
          
          toast({
            title: "이미지 추가 완료",
            description: "이미지가 성공적으로 추가되었습니다.",
          });
        } catch (error) {
          console.error('Error compressing image:', error);
          toast({
            title: "이미지 처리 실패",
            description: "이미지를 처리하는데 실패했습니다.",
            variant: "destructive"
          });
        }
      }
    }
    
    setIsUploading(false);
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  if (!user) {
    return null; // useRequireAuth will handle the redirect
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/community")}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">글쓰기</h1>
          </div>
          
          <Button
            type="button"
            onClick={async (e) => {
              console.log("=== 완료 버튼 클릭 ===");
              e.preventDefault();
              e.stopPropagation();
              
              // 폼 데이터를 직접 가져와서 제출
              const formData = form.getValues();
              console.log("Current form values:", formData);
              
              // 유효성 검사 실행
              const isValid = await form.trigger();
              console.log("Form validation result:", isValid);
              console.log("Form errors after validation:", form.formState.errors);
              
              if (isValid) {
                console.log("Form is valid, calling onSubmit");
                onSubmit(formData);
              } else {
                console.log("Form validation failed");
                toast({
                  title: "입력 오류",
                  description: "필수 항목을 모두 입력해주세요.",
                  variant: "destructive"
                });
              }
            }}
            disabled={createPostMutation.isPending}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 text-sm"
          >
            {createPostMutation.isPending ? "작성중..." : "완료"}
          </Button>
        </div>
      </header>

      {/* Form */}
      <div className="p-4 pb-20">
        <Form {...form}>
          <form 
            onSubmit={(e) => {
              console.log("Form onSubmit triggered");
              e.preventDefault();
              form.handleSubmit(onSubmit)(e);
            }} 
            className="space-y-6"
          >
            {/* Category Selection */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>카테고리 *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="카테고리를 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="이야기방">이야기방</SelectItem>
                      <SelectItem value="모임방">모임방</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제목 *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="제목을 입력하세요"
                      {...field} 
                      className="text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Semester Selection - Only for 모임방 */}
            {form.watch("category") === "모임방" && (
              <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>학기 *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="학기를 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {semesterOptions.map((semester) => (
                          <SelectItem key={semester} value={semester}>
                            {semester}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}



            {/* School Input */}
            <FormField
              control={form.control}
              name="school"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>학교 *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="학교명을 입력하세요"
                      {...field} 
                      className="text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Country Selection */}
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>국가 *</FormLabel>
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

            {/* Open Chat Link - Only for 모임방 */}
            {form.watch("category") === "모임방" && (
              <FormField
                control={form.control}
                name="openChatLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>오픈 카톡 링크</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://open.kakao.com/..."
                        {...field} 
                        className="text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>내용 *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="내용을 입력하세요..."
                      className="min-h-[200px] text-base resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Image Upload */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">
                이미지 ({uploadedImages.length}/2)
              </label>
              
              {/* Image Preview */}
              {uploadedImages.length > 0 && (
                <div className="flex space-x-3">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`Preview ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Button */}
              {uploadedImages.length < 2 && (
                <div>
                  <input
                    type="file"
                    id="images"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="images"
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    {isUploading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        사진 추가
                      </>
                    )}
                  </label>
                </div>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}