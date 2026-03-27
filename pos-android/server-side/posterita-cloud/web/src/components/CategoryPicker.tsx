"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ChevronRight, X, Search, FolderTree, Lock } from "lucide-react";

export interface CategoryNode {
  productcategory_id: number;
  name: string;
  parent_category_id: number | null;
  level: number;
}

interface CategoryPickerProps {
  categories: CategoryNode[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
  /** Allow selecting parent categories (used for filtering, not for product assignment) */
  allowParentSelection?: boolean;
  /** Allow clearing the selection */
  clearable?: boolean;
}

interface TreeNode extends CategoryNode {
  children: TreeNode[];
  path: string[];
  isLeaf: boolean;
}

function buildTree(categories: CategoryNode[]): TreeNode[] {
  const nodeMap = new Map<number, TreeNode>();
  const roots: TreeNode[] = [];

  for (const cat of categories) {
    nodeMap.set(cat.productcategory_id, {
      ...cat,
      children: [],
      path: [cat.name],
      isLeaf: true,
    });
  }

  for (const cat of categories) {
    const node = nodeMap.get(cat.productcategory_id)!;
    if (cat.parent_category_id && cat.parent_category_id !== 0 && nodeMap.has(cat.parent_category_id)) {
      const parent = nodeMap.get(cat.parent_category_id)!;
      parent.children.push(node);
      parent.isLeaf = false;
    } else {
      roots.push(node);
    }
  }

  function setPaths(nodes: TreeNode[], parentPath: string[]) {
    for (const node of nodes) {
      node.path = [...parentPath, node.name];
      setPaths(node.children, node.path);
    }
  }
  setPaths(roots, []);

  function sortChildren(nodes: TreeNode[]) {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const n of nodes) sortChildren(n.children);
  }
  sortChildren(roots);

  return roots;
}

function flattenTree(roots: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  function walk(nodes: TreeNode[]) {
    for (const n of nodes) {
      result.push(n);
      walk(n.children);
    }
  }
  walk(roots);
  return result;
}

export default function CategoryPicker({
  categories,
  value,
  onChange,
  placeholder = "Select category...",
  allowParentSelection = false,
  clearable = true,
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const tree = useMemo(() => buildTree(categories), [categories]);
  const flat = useMemo(() => flattenTree(tree), [tree]);

  const selectedNode = useMemo(
    () => flat.find((n) => n.productcategory_id === value) ?? null,
    [flat, value]
  );

  // Filter by query — match name or path, include ancestors of matches
  const filtered = useMemo(() => {
    if (!query.trim()) return flat;
    const q = query.toLowerCase().trim();
    const matchIds = new Set<number>();
    for (const node of flat) {
      if (
        node.name.toLowerCase().includes(q) ||
        node.path.join(" > ").toLowerCase().includes(q)
      ) {
        matchIds.add(node.productcategory_id);
        let parentId = node.parent_category_id;
        while (parentId && parentId !== 0) {
          matchIds.add(parentId);
          const parent = flat.find((n) => n.productcategory_id === parentId);
          parentId = parent?.parent_category_id ?? null;
        }
      }
    }
    return flat.filter((n) => matchIds.has(n.productcategory_id));
  }, [flat, query]);

  const selectableItems = useMemo(
    () => filtered.filter((n) => allowParentSelection || n.isLeaf),
    [filtered, allowParentSelection]
  );

  const isSelectable = useCallback(
    (node: TreeNode) => allowParentSelection || node.isLeaf,
    [allowParentSelection]
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-selectable]");
      items[highlightIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  // Focus input and position dropdown when it opens
  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed" as const,
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const handleSelect = (node: TreeNode) => {
    if (!isSelectable(node)) return;
    onChange(node.productcategory_id);
    setOpen(false);
    setQuery("");
    setHighlightIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, selectableItems.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < selectableItems.length) {
          handleSelect(selectableItems[highlightIndex]);
        }
        break;
      case "Escape":
        setOpen(false);
        setQuery("");
        setHighlightIndex(-1);
        break;
    }
  };

  const displayValue = selectedNode ? selectedNode.path.join(" > ") : "";

  return (
    <div ref={containerRef} className="relative">
      {/* Input area */}
      <div
        className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-sm transition cursor-text ${
          open
            ? "border-posterita-blue ring-2 ring-posterita-blue/20"
            : "border-gray-200 hover:border-gray-300"
        }`}
        onClick={() => {
          if (!open) {
            setOpen(true);
            setQuery("");
          }
        }}
      >
        <Search size={14} className="text-gray-400 flex-shrink-0" />

        {/* Always show the input when open, breadcrumb when closed */}
        {open ? (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlightIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={selectedNode ? `Search... (${selectedNode.name})` : placeholder}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400 min-w-0"
          />
        ) : selectedNode ? (
          <div className="flex-1 flex items-center gap-1 min-w-0">
            {selectedNode.path.map((seg, i) => (
              <span key={i} className="flex items-center gap-1 min-w-0">
                {i > 0 && <ChevronRight size={10} className="text-gray-300 flex-shrink-0" />}
                <span className={`truncate ${i === selectedNode.path.length - 1 ? "text-gray-900 font-medium" : "text-gray-400 text-xs"}`}>
                  {seg}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <span className="flex-1 text-gray-400 text-sm">{placeholder}</span>
        )}

        {/* Clear button */}
        {clearable && value != null && !open && (
          <button
            onClick={handleClear}
            className="text-gray-300 hover:text-gray-500 p-0.5 flex-shrink-0"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown — uses fixed positioning to escape overflow containers */}
      {open && (
        <div
          ref={listRef}
          className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
          style={dropdownStyle}
        >
          {/* Match count */}
          {query.trim() && (
            <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-[10px] text-gray-400">
              {filtered.length} {filtered.length === 1 ? "match" : "matches"}
              {selectableItems.length < filtered.length && ` (${selectableItems.length} selectable)`}
            </div>
          )}
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                <FolderTree size={24} className="mx-auto mb-2 text-gray-300" />
                {query.trim() ? `No categories matching "${query}"` : "No categories available"}
              </div>
            ) : (
              filtered.map((node) => {
                const selectable = isSelectable(node);
                const selectableIdx = selectable ? selectableItems.indexOf(node) : -1;
                const isHighlighted = selectable && selectableIdx === highlightIndex;
                const isSelected = node.productcategory_id === value;

                return (
                  <div
                    key={node.productcategory_id}
                    data-selectable={selectable ? "true" : undefined}
                    onClick={() => {
                      if (selectable) handleSelect(node);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 text-sm transition ${
                      selectable
                        ? isHighlighted
                          ? "bg-blue-50 text-blue-700"
                          : isSelected
                          ? "bg-blue-50/50 text-blue-700"
                          : "text-gray-700 hover:bg-gray-50 cursor-pointer"
                        : "text-gray-400 cursor-not-allowed"
                    }`}
                    style={{ paddingLeft: `${12 + node.level * 20}px` }}
                  >
                    {/* Tree connector */}
                    {node.level > 0 && (
                      <span className="text-gray-300 text-xs font-mono flex-shrink-0">
                        {node.level === 1 ? "├─" : "│ ├─"}
                      </span>
                    )}

                    {/* Icon */}
                    {selectable ? (
                      <FolderTree
                        size={14}
                        className={`flex-shrink-0 ${
                          isHighlighted || isSelected ? "text-blue-500" : "text-gray-400"
                        }`}
                      />
                    ) : (
                      <Lock size={12} className="text-gray-300 flex-shrink-0" />
                    )}

                    {/* Name with search highlight */}
                    <span
                      className={`flex-1 truncate ${
                        node.level === 0 ? "font-medium" : ""
                      } ${!selectable ? "text-gray-400 line-through decoration-gray-300" : ""}`}
                    >
                      {query.trim() ? highlightMatch(node.name, query) : node.name}
                    </span>

                    {/* Badge for non-leaf (has sub-categories) */}
                    {!node.isLeaf && !allowParentSelection && (
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
                        {node.children.length} sub
                      </span>
                    )}

                    {/* Selected check */}
                    {isSelected && (
                      <span className="text-blue-600 font-bold text-xs flex-shrink-0">&#10003;</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Highlight matching substring in bold */
function highlightMatch(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.trim().length);
  const after = text.slice(idx + query.trim().length);
  return (
    <>
      {before}
      <span className="font-bold underline decoration-blue-300">{match}</span>
      {after}
    </>
  );
}
