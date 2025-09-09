// src/components/StatCard.tsx
import { useMemo, useState, useContext, createContext } from "react";
import type React from "react";
import type { PropsWithChildren } from "react";
import defaultFireImage from "../assets/fire.png";
import { useTranslation } from "react-i18next";

/* ===================== Group Context ===================== */
type SelectionMode = "single" | "multiple";

type GroupCtx = {
  mode: SelectionMode;
  isActive: (id: string) => boolean;
  toggle: (id: string) => void;
};

const StatCardGroupContext = createContext<GroupCtx | null>(null);

// src/components/StatCard.tsx  (เฉพาะส่วน Group)
type StatCardGroupProps = PropsWithChildren<{
  selectionMode?: SelectionMode;
  defaultActiveIds?: string[];
  activeIds?: string[]; // controlled
  onChange?: (activeIds: string[]) => void;
  className?: string;
}>;

export function StatCardGroup({
  selectionMode = "multiple",
  defaultActiveIds = [],
  activeIds,
  onChange,
  className,
  children,
}: StatCardGroupProps) {
  const [internalActive, setInternalActive] =
    useState<string[]>(defaultActiveIds);

  const current = activeIds ?? internalActive;
  const isActive = (id: string) => current.includes(id);

  const toggle = (id: string) => {
    const base = current;
    let next: string[];
    if (selectionMode === "single") {
      next = base.includes(id) ? [] : [id];
    } else {
      next = base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
    }
    if (activeIds === undefined) {
      setInternalActive(next);
    }
    onChange?.(next);
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
  id?: string;
  counting?: number | string;
  val?: number | string;
  label?: string;
  img?: string;
  activeImg?: string;
  inactiveBg?: string;
  activeBg?: string;
  startActive?: boolean;
  /** ถ้า true: อักษรอยู่ซ้าย (บน–ล่าง), รูปอยู่ขวา */
  reverseLayout?: boolean;
  className?: string;
  onToggle?: (active: boolean) => void;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
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
  reverseLayout = false,
  className,
  onToggle,
  onClick,
}) => {
  const group = useContext(StatCardGroupContext);
  const { t } = useTranslation(["dashboard"]);

  // ===== Placeholder mode (+ Add Event) =====
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
        <span className="text-[14px] font-bold">
          {t("stats.addEvent", { defaultValue: "+ Add Event" })}
        </span>
      </div>
    );
  }

  // ===== โหมดปกติ =====
  const [localActive, setLocalActive] = useState(startActive);
  const active = group ? (id ? group.isActive(id) : false) : localActive;

  const displayVal = counting ?? val ?? 12;

  // ลำดับ fallback ของข้อความ:
  // 1) label จาก props
  // 2) แปลจาก stats.<id> ถ้ามี id
  // 3) แปลจาก stats.fire หรืออังกฤษ
  const intlLabelFromId = id
    ? t(`stats.${id}`, { defaultValue: undefined })
    : undefined;
  const displayLabel =
    label ??
    intlLabelFromId ??
    t("stats.fire", { defaultValue: "Fire detected" });

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
      if (!id) return;
      group.toggle(id);
      onToggle?.(!active);
    } else {
      const next = !localActive;
      setLocalActive(next);
      onToggle?.(next);
    }
  };

  // ===== Layout =====
  const containerBase =
    "w-[225px] h-[95px] rounded-md select-none border border-cyan-500 hover:cursor-pointer hover:shadow-xl hover:scale-[1.01]";
  const containerLayout = reverseLayout
    ? "flex items-center justify-between px-4"
    : "flex justify-center items-center gap-6";

  const textColor = isWhiteBg ? "text-gray-700" : "text-white";
  const textBox = reverseLayout
    ? "font-inter flex flex-col items-start justify-center"
    : "font-inter flex flex-col items-center justify-center";

  return (
    <div
      onClick={handleToggle}
      className={[
        containerBase,
        containerLayout,
        isTailwindBg ? currentBg : "",
        className || "",
      ].join(" ")}
      style={!isTailwindBg ? { backgroundColor: currentBg } : undefined}
    >
      {reverseLayout ? (
        <>
          {/* ข้อความซ้าย (บน–ล่าง) */}
          <div className={[textColor, textBox].join(" ")}>
            <div className="text-[11px] font-semibold mt-[-7px]">
              {displayLabel}
            </div>
            <div className="text-[24px] font-bold">{displayVal}</div>
          </div>
          {/* รูปขวา */}
          <div>
            <img src={currentImg} width={36} height={35} alt="" />
          </div>
        </>
      ) : (
        <>
          {/* รูปซ้าย */}
          <div>
            <img src={currentImg} width={36} height={35} alt="" />
          </div>
          {/* ข้อความขวา (กึ่งกลาง) */}
          <div className={[textColor, textBox].join(" ")}>
            <div className="text-[24px] font-bold">{displayVal}</div>
            <div className="text-[11px] font-semibold mt-[-7px]">
              {displayLabel}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StatCard;
