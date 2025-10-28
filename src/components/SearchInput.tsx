// src/components/SearchInput.tsx
import React from "react";
import searchIcon from "../assets/search.png";

type ResultItem =
  | string
  | {
      label: string;
      value?: string | number;
      iconSrc?: string;
    };

type RenderMenuCtx = {
  open: boolean;
  items: ResultItem[];
  onSelect: (item: ResultItem) => void;
  close: () => void;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  rootRef: React.MutableRefObject<HTMLLabelElement | null>;
};

type Props = {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;

  resultMenu?: ResultItem[];
  onSelect?: (item: ResultItem) => void;

  disableMenu?: boolean;
  renderMenu?: (ctx: RenderMenuCtx) => React.ReactNode;

  showEmptyWhenNoResult?: boolean;

  menuClassName?: string;
  menuItemClassName?: string;

  getItemLabel?: (item: ResultItem) => string;
  getItemKey?: (item: ResultItem, idx: number) => React.Key;

  emptyText?: string;
};

export default function SearchInput({
  value,
  onChange,
  placeholder = "",
  className = "",
  inputClassName = "",
  resultMenu = [],
  onSelect,
  disableMenu = false,
  renderMenu,
  showEmptyWhenNoResult = false,
  menuClassName = "",
  menuItemClassName = "",
  getItemLabel,
  getItemKey,
  emptyText = "ไม่พบผลลัพธ์",
}: Props) {
  const [focused, setFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const rootRef = React.useRef<HTMLLabelElement | null>(null);

  const labelOf = React.useCallback(
    (item: ResultItem) => {
      if (getItemLabel) return getItemLabel(item);
      return typeof item === "string" ? item : item.label;
    },
    [getItemLabel]
  );

  const keyOf = React.useCallback(
    (item: ResultItem, idx: number) => {
      if (getItemKey) return getItemKey(item, idx);
      if (typeof item === "string") return `${item}-${idx}`;
      return (item.value ?? item.label ?? idx).toString();
    },
    [getItemKey]
  );

  // เปิดเมนูต่อเมื่อโฟกัส + ไม่ถูก disable
  // และต้องมีผลลัพธ์ หรืออนุญาตให้โชว์ empty
  const hasItems = (resultMenu?.length ?? 0) > 0;
  const wantShowEmpty = showEmptyWhenNoResult && !hasItems;
  const isMenuOpen = focused && !disableMenu && (hasItems || wantShowEmpty);

  const handleSelect = (item: ResultItem) => {
    onSelect?.(item);
    // ปิดเมนูหลังเลือกเล็กน้อย เพื่อให้ onMouseDown ทำงาน
    window.setTimeout(() => setFocused(false), 0);
  };

  const ctx: RenderMenuCtx = {
    open: isMenuOpen,
    items: resultMenu,
    onSelect: handleSelect,
    close: () => setFocused(false),
    inputRef,
    rootRef,
  };

  return (
    <label ref={rootRef} className={`relative inline-block ${className}`}>
      {/* ไอคอนแว่นขยาย */}
      <img
        src={searchIcon}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-[17px] text-gray-400"
        alt=""
      />

      {/* กล่อง input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          // หน่วงนิดหน่อยเพื่อให้ onMouseDown ที่เมนูทำงานก่อน blur
          setTimeout(() => setFocused(false), 120);
        }}
        className={`h-[40px] w-full font-inter rounded-md border border-gray-300 bg-white pl-9 pr-3 text-[14px] leading-none placeholder:text-gray-400 focus:outline-none focus:ring-2 ${inputClassName}`}
      />
      <span className="sr-only">ค้นหา</span>

      {/* ===== โหมดให้หน้าพ่อเรนเดอร์เมนูเอง ===== */}
      {typeof renderMenu === "function"
        ? renderMenu(ctx)
        : /* ===== เมนูภายใน (ถ้าไม่ disable) ===== */
          isMenuOpen && (
            <div
              className={[
                "absolute left-0 right-0 z-50 mt-1",
                "rounded-md border border-gray-300 bg-white shadow-md",
                "max-h-72 overflow-y-auto",
                "w-auto min-w-full", // ให้กว้างอย่างน้อยเท่า input
                menuClassName,
              ].join(" ")}
            >
              {!hasItems ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  {emptyText}
                </div>
              ) : (
                resultMenu.map((item, idx) => {
                  const label = labelOf(item);
                  return (
                    <button
                      key={keyOf(item, idx)}
                      type="button"
                      // ใช้ onMouseDown เพื่อให้ทำงานก่อน blur ของ input
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(item);
                      }}
                      className={[
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100",
                        "whitespace-nowrap", // กันตัดขึ้นบรรทัดใหม่
                        menuItemClassName,
                      ].join(" ")}
                      title={label}
                    >
                      {typeof item !== "string" && item.iconSrc && (
                        <img
                          src={item.iconSrc}
                          alt=""
                          className="w-4 h-4 object-contain"
                        />
                      )}
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
    </label>
  );
}
