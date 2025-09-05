import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Upload, Camera, Folder, X, Star, Move, CalendarIcon } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useRequireAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { insertItemSchema, type InsertItem } from "@shared/schema";
import { COUNTRIES } from "@/lib/countries";
import { cn } from "@/lib/utils";
import { useExchangeRates } from "@/hooks/use-exchange";



const conditions = [
  "새 상품",
  "거의 새 것",
  "양호",
  "사용감 있음",
  "많이 사용함",
];

const deliveryMethods = [
  "직거래",
  "택배",
  "대리전달",
  "기타",
];

const currencies = [
  { code: "USD", symbol: "$", name: "미국 달러", rate: 1 },
  { code: "EUR", symbol: "€", name: "유로", rate: 0.92 },
  { code: "JPY", symbol: "¥", name: "일본 엔", rate: 149.5 },
  { code: "GBP", symbol: "£", name: "영국 파운드", rate: 0.79 },
  { code: "CNY", symbol: "¥", name: "중국 위안", rate: 7.24 },
];

// USD to KRW rate (example: 1 USD = 1350 KRW)
const USD_TO_KRW = 1350;

export default function CreateItem() {
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState(currencies[0]);
  const [priceValue, setPriceValue] = useState("");
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState("");
  const [customDeliveryMethod, setCustomDeliveryMethod] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useRequireAuth();
  const { formatPrice } = useExchangeRates();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // KRW로 환산된 가격 계산 (formatPrice 함수 사용)
  const convertedPrice = priceValue && selectedCurrency ? formatPrice(parseFloat(priceValue), selectedCurrency.code) : "";

  const form = useForm<InsertItem>({
    resolver: zodResolver(insertItemSchema),
    defaultValues: {
      title: "",
      description: "",
      price: "",
      condition: "",
      images: [],
      sellerId: user?.id || "", // sellerId 기본값 추가
      school: user?.school || "",
      country: user?.country || "",
      location: user?.school || "",
      deliveryMethod: "",
      customDeliveryMethod: "",
      availableFrom: undefined,
      availableTo: undefined,
      isAvailable: true,
    },
  });

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

  // Handle image upload with compression
  const handleImageUpload = async (files: FileList | null, isCamera: boolean = false) => {
    if (!files) return;
    
    setIsLoading(true);
    
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        try {
          // 성공 팝업 제거 - 이미지 처리 중 토스트 제거
          
          // Compress image before adding to state
          console.log(`Original file size: ${file.size} bytes`);
          const compressedImage = await compressImage(file);
          const compressedSize = (compressedImage.length * 3) / 4;
          console.log(`Compressed file size: ${compressedSize} bytes (${Math.round(compressedSize / 1024)}KB)`);
          
          setImages(prev => [...prev, compressedImage]);
          const currentImages = form.getValues('images') || [];
          form.setValue('images', [...currentImages, compressedImage]);
          
          // 성공 팝업 제거 - 이미지 추가 완료 토스트 제거
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
    
    setIsLoading(false);
  };

  // Remove image
  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    form.setValue('images', newImages);
  };

  // Move image to front (make it primary)
  const makePrimaryImage = (index: number) => {
    const newImages = [...images];
    const primaryImage = newImages.splice(index, 1)[0];
    newImages.unshift(primaryImage);
    setImages(newImages);
    form.setValue('images', newImages);
  };

  // Drag and drop for image reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    
    // Remove dragged image
    newImages.splice(draggedIndex, 1);
    // Insert at new position
    newImages.splice(dropIndex, 0, draggedImage);
    
    setImages(newImages);
    form.setValue('images', newImages);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Update price when currency or value changes
  useEffect(() => {
    if (priceValue && selectedCurrency) {
      // 선택된 통화를 USD로 변환하여 저장 (기존 로직 사용)
      const usdPrice = parseFloat(priceValue) / selectedCurrency.rate;
      form.setValue('price', usdPrice.toFixed(2));
      form.setValue('currency', selectedCurrency.code);
    } else {
      form.setValue('price', '');
    }
  }, [priceValue, selectedCurrency, form]);

  const createItemMutation = useMutation({
    mutationFn: async (data: InsertItem) => {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("인증이 필요합니다. 다시 로그인해주세요.");
      }
      console.log("Attempting to create item with token:", token ? "present" : "missing");
      const res = await apiRequest("POST", "/api/items", data);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate all items queries with all possible filter combinations
      queryClient.invalidateQueries({ 
        queryKey: ["/api/items"], 
        exact: false 
      });
      
      // 성공 팝업 제거 - 상품 등록 성공 시 toast 제거
      navigate("/");
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      if (error.message.includes("401") || error.message.includes("Invalid token") || error.message.includes("Unauthorized")) {
        toast({
          title: "인증 오류",
          description: "로그인이 만료되었습니다. 다시 로그인해주세요.",
          variant: "destructive",
        });
        navigate("/auth/login");
      } else {
        toast({
          variant: "destructive",
          title: "상품 등록 실패",
          description: error.message || "상품 등록 중 오류가 발생했습니다.",
        });
      }
    },
  });

  const onSubmit = async (data: InsertItem) => {
    console.log('📋 onSubmit 함수 호출');
    console.log('📋 Form submitted with data:', data);
    console.log('📋 Form valid:', form.formState.isValid);
    console.log('📋 Form errors:', form.formState.errors);
    
    if (images.length === 0) {
      console.log('❌ 이미지 없음 - 토스트 표시');
      toast({
        variant: "destructive",
        title: "사진을 업로드해주세요",
        description: "최소 1장의 사진이 필요합니다.",
      });
      return;
    }

    console.log('📋 이미지 갯수:', images.length);
    setIsLoading(true);
    try {
      // Include images and convert price to USD
      console.log('📑 폼 데이터 전송 전:', data);
      console.log('📑 사용자 ID:', user?.id);
      
      const submitData = {
        ...data,
        sellerId: user?.id || data.sellerId, // sellerId 확실히 설정
        images,
        price: form.getValues('price'),
        school: user?.school || "",
        country: user?.country || "",
        location: data.location || user?.school || "",
        deliveryMethod: data.deliveryMethod || "",
        customDeliveryMethod: data.deliveryMethod === "기타" ? data.customDeliveryMethod : "",
        availableFrom: data.availableFrom ? new Date(data.availableFrom) : null,
        availableTo: data.availableTo ? new Date(data.availableTo) : null,
        currency: selectedCurrency.code,
      };
      console.log('Submitting item data:', submitData);
      createItemMutation.mutate(submitData);
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-gray-600"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            뒤로
          </Button>
          <h1 className="text-lg font-semibold">상품 등록</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="pb-20 pt-4 px-4">
        <Card>
          <CardHeader>
            <CardTitle>상품 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Image Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">상품 사진</label>
                  
                  {/* Upload Area */}
                  {images.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-4">사진을 업로드하세요</p>
                      <div className="flex gap-2 justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Upload className="h-4 w-4 mr-2" />
                              사진 추가
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => cameraInputRef.current?.click()}>
                              <Camera className="h-4 w-4 mr-2" />
                              카메라로 촬영
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                              <Folder className="h-4 w-4 mr-2" />
                              폴더에서 선택
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">최대 10장까지 가능</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Image Grid */}
                      <div className="grid grid-cols-3 gap-2">
                        {images.map((image, index) => (
                          <div 
                            key={index} 
                            className={`relative group cursor-move transition-transform ${
                              draggedIndex === index ? 'scale-105 rotate-2 z-10' : 'hover:scale-102'
                            }`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                          >
                            <img
                              src={image}
                              alt={`상품 사진 ${index + 1}`}
                              className={`w-full h-24 object-cover rounded-lg transition-all ${
                                draggedIndex === index ? 'opacity-60' : ''
                              }`}
                            />
                            
                            {/* Primary Badge */}
                            {index === 0 && (
                              <Badge className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 py-0">
                                <Star className="h-3 w-3 mr-1" />
                                대표
                              </Badge>
                            )}
                            
                            {/* Drag Indicator */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-20 rounded-lg">
                              <Move className="h-6 w-6 text-white" />
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex gap-1">
                                {index !== 0 && (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="h-6 w-6 p-0 bg-white hover:bg-gray-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      makePrimaryImage(index);
                                    }}
                                  >
                                    <Star className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeImage(index);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Add More Button */}
                        {images.length < 10 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <div className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                                <Upload className="h-6 w-6 text-gray-400" />
                              </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => cameraInputRef.current?.click()}>
                                <Camera className="h-4 w-4 mr-2" />
                                카메라로 촬영
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                                <Folder className="h-4 w-4 mr-2" />
                                폴더에서 선택
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>• 첫 번째 사진이 대표 사진으로 설정됩니다</p>
                        <p>• 사진을 드래그해서 순서를 변경할 수 있습니다</p>
                        <p>• ⭐ 버튼을 클릭하면 해당 사진을 대표 사진으로 설정합니다</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Hidden File Inputs */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files)}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files, true)}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>제목</FormLabel>
                      <FormControl>
                        <Input placeholder="상품 제목을 입력하세요" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>설명</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="상품에 대한 자세한 설명을 입력하세요"
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Price with Currency Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">가격</label>
                  
                  {/* Original Currency Price */}
                  <div className="flex gap-2">
                    {/* Currency Selector */}
                    <Select
                      value={selectedCurrency.code}
                      onValueChange={(value) => {
                        const currency = currencies.find(c => c.code === value);
                        if (currency) setSelectedCurrency(currency);
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue>
                          {selectedCurrency.symbol} {selectedCurrency.code}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            <div className="flex items-center gap-2">
                              <span>{currency.symbol}</span>
                              <span>{currency.code}</span>
                              <span className="text-xs text-gray-500">{currency.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Price Input */}
                    <Input
                      placeholder="0"
                      type="number"
                      step="0.01"
                      value={priceValue}
                      onChange={(e) => setPriceValue(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  
                  {/* KRW Conversion Display */}
                  <div className="flex gap-2">
                    <div className="w-32 flex items-center justify-center bg-gray-100 rounded-md px-3 py-2">
                      <span className="text-sm font-medium text-gray-600">₩ KRW</span>
                    </div>
                    <Input
                      placeholder="0"
                      type="text"
                      value={priceValue ? formatPrice(parseFloat(priceValue), selectedCurrency.code) : ""}
                      readOnly
                      className="flex-1 bg-gray-50 text-gray-600"
                    />
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    한국 원화로 자동 환산됩니다
                  </p>
                </div>



                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>상품 상태</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="상품 상태를 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {conditions.map((condition) => (
                            <SelectItem key={condition} value={condition}>
                              {condition}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <FormLabel>거래 국가</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="거래할 국가를 선택하세요" />
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
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>거래 희망 장소</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="거래를 희망하는 장소를 입력하세요"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Delivery Method */}
                <FormField
                  control={form.control}
                  name="deliveryMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>거래 방법</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedDeliveryMethod(value);
                          if (value !== "기타") {
                            setCustomDeliveryMethod("");
                            form.setValue("customDeliveryMethod", "");
                          }
                        }} 
                        defaultValue={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="거래 방법을 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {deliveryMethods.map((method) => (
                            <SelectItem key={method} value={method}>
                              {method}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Custom Delivery Method Input */}
                {selectedDeliveryMethod === "기타" && (
                  <FormField
                    control={form.control}
                    name="customDeliveryMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>기타 거래 방법 상세</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="기타 거래 방법을 입력하세요"
                            {...field}
                            value={customDeliveryMethod || ""}
                            onChange={(e) => {
                              setCustomDeliveryMethod(e.target.value);
                              field.onChange(e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Available Period - 단일 달력으로 범위 선택 */}
                <div className="space-y-4">
                  <label className="text-sm font-medium">거래가능기간</label>
                  <div className="space-y-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal justify-start",
                            (!form.watch("availableFrom") && !form.watch("availableTo")) && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {(() => {
                            const fromDate = form.watch("availableFrom");
                            const toDate = form.watch("availableTo");
                            
                            if (fromDate && toDate) {
                              return `${format(fromDate, "yyyy-MM-dd")} ~ ${format(toDate, "yyyy-MM-dd")}`;
                            } else if (fromDate) {
                              return `${format(fromDate, "yyyy-MM-dd")} ~ 종료일 선택`;
                            } else {
                              return "거래가능기간 선택";
                            }
                          })()}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          defaultMonth={form.watch("availableFrom") || new Date()}
                          selected={{
                            from: form.watch("availableFrom") || undefined,
                            to: form.watch("availableTo") || undefined
                          } as DateRange}
                          onSelect={(range: DateRange | undefined) => {
                            console.log('📅 달력 선택 이벤트:', range);
                            
                            if (!range) {
                              form.setValue("availableFrom", undefined);
                              form.setValue("availableTo", undefined);
                              return;
                            }
                            
                            if (range.from) {
                              form.setValue("availableFrom", range.from);
                              console.log('✅ 시작일 설정:', range.from);
                            }
                            
                            if (range.to) {
                              form.setValue("availableTo", range.to);
                              console.log('✅ 종료일 설정:', range.to);
                            } else {
                              form.setValue("availableTo", undefined);
                              console.log('⚠️ 종료일 초기화');
                            }
                          }}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          numberOfMonths={1}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <p className="text-xs text-gray-500">
                    거래가능기간을 설정하지 않으면 상품이 계속 거래 가능한 상태로 유지됩니다.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full marketplace-button-primary"
                  disabled={isLoading || createItemMutation.isPending}
                  onClick={() => {
                    console.log('Button clicked');
                    console.log('Form values:', form.getValues());
                    console.log('Form valid:', form.formState.isValid);
                    console.log('Form errors:', form.formState.errors);
                  }}
                >
                  {isLoading || createItemMutation.isPending ? "등록 중..." : "상품 등록"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
