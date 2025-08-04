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
    <div className="bg-white px-4 py-3 border-b border-gray-200 sticky top-16 z-40">
      <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              activeFilter === filter.id
                ? "marketplace-button-primary"
                : "marketplace-button-secondary"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}
