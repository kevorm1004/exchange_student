import { cn } from "@/lib/utils";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FilterBarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  selectedCountry?: string;
  onCountryChange?: (country: string) => void;
}

export default function FilterBar({ 
  activeFilter, 
  onFilterChange, 
  selectedCountry = "all",
  onCountryChange 
}: FilterBarProps) {
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const filters = [
    { id: "all", label: "전체" },
    { id: "school", label: "내 학교" },
  ];

  const countries = [
    { id: "all", label: "모든 국가" },
    { id: "Korea", label: "한국" },
    { id: "USA", label: "미국" },
    { id: "Japan", label: "일본" },
    { id: "China", label: "중국" },
    { id: "Canada", label: "캐나다" },
    { id: "Australia", label: "호주" },
    { id: "UK", label: "영국" },
    { id: "Germany", label: "독일" },
    { id: "France", label: "프랑스" },
  ];

  return (
    <div className="bg-white px-4 py-3 border-b border-gray-200 sticky top-16 z-40 border-t-0">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border flex-shrink-0",
              activeFilter === filter.id
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
          >
            {filter.label}
          </button>
        ))}
        
        {/* 국가별 드롭다운 */}
        <DropdownMenu open={showCountryDropdown} onOpenChange={setShowCountryDropdown}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border flex-shrink-0 flex items-center gap-1",
                activeFilter === "country"
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              )}
            >
              {countries.find(c => c.id === selectedCountry)?.label || "국가별"}
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {countries.map((country) => (
              <DropdownMenuItem
                key={country.id}
                onClick={() => {
                  onCountryChange?.(country.id);
                  onFilterChange("country");
                  setShowCountryDropdown(false);
                }}
                className={cn(
                  "cursor-pointer",
                  selectedCountry === country.id && "bg-blue-50 text-blue-600"
                )}
              >
                {country.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
