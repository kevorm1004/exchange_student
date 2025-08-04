import { cn } from "@/lib/utils";

interface FilterBarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export default function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  const filters = [
    { id: "all", label: "전체" },
    { id: "school", label: "내 학교" },
    { id: "country", label: "국가별" },
    { id: "category", label: "카테고리" },
  ];

  return (
    <div className="bg-white px-4 py-3 border-b border-gray-200 sticky top-16 z-40 -mt-px">
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
      </div>
    </div>
  );
}
