import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { FILTER_COUNTRIES } from "@/lib/countries";

interface FilterBarProps {
  filter: string;
  onFilterChange: (filter: string) => void;
  selectedCountry: string;
  onCountryChange: (country: string) => void;
  onlyAvailable?: boolean;
  onToggleAvailable?: (available: boolean) => void;
  user?: any; // 로그인한 사용자 정보
}

export default function FilterBar({ filter, onFilterChange, selectedCountry, onCountryChange, onlyAvailable = false, onToggleAvailable, user }: FilterBarProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-3">
      {/* 상품 필터 */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange("all")}
          className={cn(
            "text-sm",
            filter === "all" ? "marketplace-button-primary" : ""
          )}
        >
          전체
        </Button>
        {/* 로그인한 사용자만 "우리 학교" 필터 표시 */}
        {user && (
          <Button
            variant={filter === "school" ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange("school")}
            className={cn(
              "text-sm",
              filter === "school" ? "marketplace-button-primary" : ""
            )}
          >
            우리 학교
          </Button>
        )}
        <Button
          variant={filter === "country" ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange("country")}
          className={cn(
            "text-sm",
            filter === "country" ? "marketplace-button-primary" : ""
          )}
        >
          국가별
        </Button>
        </div>
        
        {/* 거래 가능 토글 */}
        {onToggleAvailable && (
          <div className="flex items-center space-x-2">
            <span className={cn(
              "text-sm font-medium",
              onlyAvailable ? "text-green-600" : "text-gray-500"
            )}>
              거래 가능
            </span>
            <Switch
              checked={onlyAvailable}
              onCheckedChange={onToggleAvailable}
              className="data-[state=checked]:bg-green-500"
            />
          </div>
        )}
      </div>

      {/* 국가 선택 - country 필터가 선택된 경우에만 표시 */}
      {filter === "country" && (
        <div>
          <Select value={selectedCountry} onValueChange={onCountryChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="국가를 선택해주세요" />
            </SelectTrigger>
            <SelectContent>
              {FILTER_COUNTRIES.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}