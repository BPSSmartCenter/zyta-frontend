// src/components/notiCard.tsx
import React from "react";
import fireNoti from "../assets/firenoti.svg";
import motionNoti from "../assets/motionnoti.svg";
import deviceNoti from "../assets/devicenoti.svg";
import { insuranceImage } from "../assets/index";

type NotiType = "alert" | "warning" | "offline" | "normal" | "success";

type NotiCardProps = {
  type: NotiType;
  title: string;
  site?: string;
  date?: string | number | Date; // รับได้ทั้ง ISO/number/Date หรือสตริงที่ฟอร์แมตมาแล้ว
  detail?: string;
  img?: string;
  icon?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  className?: string;
};

const cn = (...xs: Array<string | false | undefined>) =>
  xs.filter(Boolean).join(" ");

// ✔ ปลอดภัย: ถ้า parse ได้ค่อยฟอร์แมต, ถ้าไม่ได้ให้คืนสตริงเดิม
const formatDate = (d?: string | number | Date) => {
  if (d === undefined || d === null || d === "") return "";
  // Date ตรงๆ
  if (d instanceof Date) {
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  }
  // number หรือสตริงที่ parse ได้
  const parsed = new Date(d);
  if (!isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(parsed);
  }
  // สตริงที่ฟอร์แมตมาแล้ว (เช่น ไทย): แสดงตามเดิม
  return String(d);
};

const palette: Record<
  NotiType,
  { root: string; border: string; iconBg: string; title: string; meta: string }
> = {
  alert: {
    root: "bg-[#FEE4E8]",
    border: "border-none",
    iconBg: "bg-[#FB3F3F]",
    title: "text-[#181D27]",
    meta: "text-[#B8B8B8]",
  },
  warning: {
    root: "bg-[#FFF3E5]",
    border: "border-none",
    iconBg: "bg-[#FE9927]",
    title: "text-[#181D27]",
    meta: "text-[#B8B8B8]",
  },
  offline: {
    root: "bg-[#F8FBFE]",
    border: "border-none",
    iconBg: "bg-[#AFEAFF]",
    title: "text-[#181D27]",
    meta: "text-[#B8B8B8]",
  },
  success: {
    root: "bg-green-100",
    border: "border-none",
    iconBg: "bg-green-500",
    title: "text-[#181D27]", // ← fixed (เดิมพิมพ์ผิดเป็น text-#181D27)
    meta: "text-[#B8B8B8]",
  },
  normal: {
    root: "bg-[#F8FBFE]",
    border: "border-none",
    iconBg: "", // normal ไม่มี bg
    title: "text-[#181D27]",
    meta: "text-[#B8B8B8]",
  },
};

const DefaultIcon: React.FC<{ type: NotiType }> = ({ type }) => {
  if (type === "alert") return <img src={fireNoti} alt="" />;
  if (type === "warning") return <img src={motionNoti} alt="" />;
  if (type === "offline") return <img src={deviceNoti} alt="" />;
  // normal/success หากไม่ส่ง img/icon มา จะใส่รูปดีฟอลต์แบบเดิม
  return <img src={deviceNoti} alt="" />;
};

const NotiCard: React.FC<NotiCardProps> = ({
  type,
  title,
  site,
  date,
  detail,
  img,
  icon,
  onClick,
  className,
}) => {
  const p = palette[type];
  const metaPieces = [
    detail && String(detail).trim(),
    site && String(site).trim(),
    date && formatDate(date), // ← ปลอดภัยทั้งกรณีส่งสตริงไทย หรือ ISO
  ].filter(Boolean) as string[];

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex h-[77px] items-center gap-3 rounded-md border px-3 py-2.5",
        "hover:cursor-pointer hover:scale-[1.02] hover:shadow-md",
        p.root,
        p.border,
        className
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-md",
          type !== "normal" && p.iconBg // normal ไม่ใส่ bg
        )}
      >
        {img ? <img width={30} src={img} alt="" /> : icon ?? <DefaultIcon type={type} />}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div
          className={cn("truncate text-[13px] font-bold leading-5", p.title)}
        >
          {title}
        </div>

        {metaPieces.length > 0 && (
          <div
            className={cn(
              "truncate text-[12px] font-semibold leading-4",
              p.meta
            )}
          >
            {metaPieces.join(" - ")}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotiCard;
