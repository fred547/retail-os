"use client";

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: { key: string; direction: "asc" | "desc" } | null;
  onSort: (key: string) => void;
}

export default function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
}: SortableHeaderProps) {
  const isActive = currentSort?.key === sortKey;

  const handleClick = () => {
    onSort(sortKey);
  };

  return (
    <th
      onClick={handleClick}
      className="cursor-pointer select-none hover:text-gray-700"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          <span className="text-gray-700">
            {currentSort.direction === "asc" ? "▲" : "▼"}
          </span>
        ) : (
          <span className="text-gray-300">▲▼</span>
        )}
      </span>
    </th>
  );
}
