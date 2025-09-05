import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  filter: string;
  onFilterChange: (filter: string) => void;
  selectedCountry: string;
  onCountryChange: (country: string) => void;
  onlyAvailable?: boolean;
  onToggleAvailable?: (available: boolean) => void;
}

const COUNTRIES = [
  { value: "all", label: "전체 국가" },
  { value: "korea", label: "한국" },
  { value: "usa", label: "미국" },
  { value: "japan", label: "일본" },
  { value: "china", label: "중국" },
  { value: "canada", label: "캐나다" },
  { value: "australia", label: "호주" },
  { value: "uk", label: "영국" },
  { value: "germany", label: "독일" },
  { value: "france", label: "프랑스" }
];

export default function FilterBar({ filter, onFilterChange, selectedCountry, onCountryChange, onlyAvailable = false, onToggleAvailable }: FilterBarProps) {
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
              {COUNTRIES.map((country) => (
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