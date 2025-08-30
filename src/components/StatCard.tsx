// src/components/StatCard.tsx
import { useMemo, useState, useContext, createContext } from "react";
import type React from "react";
import type { PropsWithChildren } from "react";
import defaultFireImage from "../assets/fire.png";

/* ===================== Group Context ===================== */
type SelectionMode = "single" | "multiple";

type GroupCtx = {
  mode: SelectionMode;
  isActive: (id: string) => boolean;
  toggle: (id: string) => void;
};

const StatCardGroupContext = createContext<GroupCtx | null>(null);

type StatCardGroupProps = PropsWithChildren<{
  selectionMode?: SelectionMode; // default: 'multiple'
  defaultActiveIds?: string[]; // id ที่เริ่มต้น active
  onChange?: (activeIds: string[]) => void;
  className?: string;
}>;

export function StatCardGroup({
  selectionMode = "multiple",
  defaultActiveIds = [],
  onChange,
  className,
  children,
}: StatCardGroupProps) {
  const [activeIds, setActiveIds] = useState<string[]>(defaultActiveIds);

  const isActive = (id: string) => activeIds.includes(id);

  const toggle = (id: string) => {
    setActiveIds((prev) => {
      let next: string[];
      if (selectionMode === "single") {
        next = prev.includes(id) ? [] : [id]; // กดซ้ำเพื่อปิดได้
      } else {
        next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      }
      onChange?.(next);
      return next;
    });
  };

  const ctx: GroupCtx = { mode: selectionMode, isActive, toggle };

  return (
    <div className={className}>
      <StatCardGroupContext.Provider value={ctx}>
        {children}
      </StatCardGroupContext.Provider>
    </div>
  );
}

/* ===================== StatCard ===================== */
type Props = {
  id?: string; // จำเป็นถ้าใช้ใน Group

  // ค่าที่แสดง
  counting?: number | string;
  val?: number | string;
  label?: string;

  // รูปภาพ
  img?: string; // รูปปกติ
  activeImg?: string; // รูปตอน active

  // สีพื้นหลัง
  inactiveBg?: string; // default: bg-white
  activeBg?: string; // default: bg-cyan-500

  // โหมดเดี่ยว (ไม่อยู่ใน Group): เริ่ม active ไหม
  startActive?: boolean;

  // class/handlers เพิ่มเติม
  className?: string;
  onToggle?: (active: boolean) => void;
  onClick?: React.MouseEventHandler<HTMLDivElement>; // ใช้กับโหมด Placeholder
};

const StatCard: React.FC<Props> = ({
  id,
  counting,
  val,
  label,
  img,
  activeImg,
  inactiveBg = "bg-white",
  activeBg = "bg-cyan-500",
  startActive = false,
  className,
  onToggle,
  onClick,
}) => {
  const group = useContext(StatCardGroupContext);

  // ===== Placeholder mode (+ Add Event) เหมือนไฟล์เก่า =====
  const noContentProps =
    counting === undefined &&
    val === undefined &&
    label === undefined &&
    img === undefined &&
    activeImg === undefined;

  if (noContentProps) {
    return (
      <div
        onClick={onClick}
        className={[
          "flex items-center justify-center",
          "w-[225px] h-[95px]",
          "rounded-md border-2 border-dashed",
          "border-[#312F62] bg-white",
          "text-slate-400 font-poppins select-none",
          "hover:cursor-pointer hover:border-indigo-400 hover:shadow-md",
          onClick ? "cursor-pointer hover:bg-indigo-50" : "",
          className || "",
        ].join(" ")}
      >
        <span className="text-[14px] font-bold">+ Add Event</span>
      </div>
    );
  }

  // ===== โหมดปกติ =====
  // ถ้าอยู่ใน Group -> active มาจาก Group, ไม่งั้นใช้ state ภายใน
  const [localActive, setLocalActive] = useState(startActive);
  const active = group ? (id ? group.isActive(id) : false) : localActive;

  const displayVal = counting ?? val ?? 12;
  const displayLabel = label ?? "Fire detected";

  const currentBg = active ? activeBg : inactiveBg;
  const currentImg = active
    ? activeImg ?? img ?? defaultFireImage
    : img ?? defaultFireImage;

  const isTailwindBg = useMemo(() => currentBg.startsWith("bg-"), [currentBg]);

  const isWhiteBg = useMemo(() => {
    if (isTailwindBg) return currentBg.includes("bg-white");
    const v = String(currentBg).toLowerCase().replaceAll(" ", "");
    return (
      v === "#fff" ||
      v === "#ffffff" ||
      v === "white" ||
      v === "rgb(255,255,255)"
    );
  }, [currentBg, isTailwindBg]);

  const handleToggle = () => {
    if (group) {
      if (!id) return; // ป้องกันลืมใส่ id
      group.toggle(id);
      onToggle?.(!active);
    } else {
      const next = !localActive;
      setLocalActive(next);
      onToggle?.(next);
    }
  };

  return (
    <div
      onClick={handleToggle}
      className={[
        "flex justify-center items-center gap-6",
        "w-[225px] h-[95px] rounded-md select-none",
        "border border-cyan-500 hover:cursor-pointer hover:shadow-xl hover:scale-[1.01]",
        isTailwindBg ? currentBg : "",
        className || "",
      ].join(" ")}
      style={!isTailwindBg ? { backgroundColor: currentBg } : undefined}
    >
      <div className="">
        <img src={currentImg} width={36} height={35} alt="" />
      </div>

      <div
        className={[
          isWhiteBg ? "text-gray-700" : "text-white",
          "font-inter justify-center items-center flex flex-col ",
        ].join(" ")}
      >
        <div className="text-[24px] font-bold">{displayVal}</div>
        <div className="text-[11px] font-semibold mt-[-7px]">
          {displayLabel}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
