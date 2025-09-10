// src/components/StatCard.tsx
import { useMemo, useState, useContext, createContext } from "react";
import type React from "react";
import type { PropsWithChildren } from "react";
import defaultFireImage from "../assets/fire.png";
import { useTranslation } from "react-i18next";
import Switch from "./Switch";
import type { SwitchProps } from "./Switch";

/* ===================== Group Context ===================== */
type SelectionMode = "single" | "multiple";

type GroupCtx = {
  mode: SelectionMode;
  isActive: (id: string) => boolean;
  toggle: (id: string) => void;
};

const StatCardGroupContext = createContext<GroupCtx | null>(null);

// กลุ่มสำหรับควบคุม single/multiple selection
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
    if (activeIds === undefined) setInternalActive(next);
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

  /** เลือกแบบการ์ด */
  variant?: "default" | "boxWithSwitch";

  /** ส่ง props เข้า Switch เมื่อใช้ variant = 'boxWithSwitch' */
  switchProps?: SwitchProps;

  className?: string;
  onToggle?: (active: boolean) => void; // สำหรับ default variant
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
  variant = "default",
  switchProps,
  className,
  onToggle,
  onClick,
}) => {
  const group = useContext(StatCardGroupContext);
  const { t } = useTranslation(["dashboard"]);

  // ===== Placeholder (+ Add Event) =====
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

  /* ========== NEW VARIANT: boxWithSwitch ========== */
  if (variant === "boxWithSwitch") {
    const swId = switchProps?.id ?? (id ? `sw-${id}` : undefined); // unique id per card
    return (
      <div
        onClick={handleToggle} // คลิกการ์ด = เลือกการ์ด (bg cyan)
        className={[
          "p-6 flex justify-between w-[249px] h-[135px] border border-cyan rounded-lg cursor-pointer",
          active ? "bg-cyan" : "",
          className || "",
        ].join(" ")}
      >
        <div className="text-center flex flex-col items-center">
          <img src={currentImg} alt="" />
          <h1>{displayLabel}</h1>
        </div>

        {/* คลิกสวิตช์ = toggle สวิตช์อย่างเดียว */}
        <div onClick={(e) => e.stopPropagation()}>
          <Switch {...switchProps} id={swId} />
        </div>
      </div>
    );
  }

  /* ========== Layout เดิม (คงพฤติกรรมเดิม 100%) ========== */
  return (
    <div
      onClick={handleToggle}
      className={[
        "w-[225px] h-[95px] rounded-md select-none border border-cyan-500 hover:cursor-pointer hover:shadow-xl hover:scale-[1.01]",
        reverseLayout
          ? "flex items-center justify-between px-4"
          : "flex justify-center items-center gap-6",
        isTailwindBg ? currentBg : "",
        className || "",
      ].join(" ")}
      style={!isTailwindBg ? { backgroundColor: currentBg } : undefined}
    >
      {reverseLayout ? (
        <>
          <div
            className={[
              isWhiteBg ? "text-gray-700" : "text-white",
              "font-inter flex flex-col items-start justify-center",
            ].join(" ")}
          >
            <div className="text-[11px] font-semibold mt-[-7px]">
              {displayLabel}
            </div>
            <div className="text-[24px] font-bold">{displayVal}</div>
          </div>
          <div>
            <img src={currentImg} width={36} height={35} alt="" />
          </div>
        </>
      ) : (
        <>
          <div>
            <img src={currentImg} width={36} height={35} alt="" />
          </div>
          <div
            className={[
              isWhiteBg ? "text-gray-700" : "text-white",
              "font-inter flex flex-col items-center justify-center",
            ].join(" ")}
          >
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
