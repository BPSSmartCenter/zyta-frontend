// src/components/notiCard.tsx
import React from "react";
import fireNoti from "../assets/firenoti.svg";
import motionNoti from "../assets/motionnoti.svg";
import deviceNoti from "../assets/devicenoti.svg";
import fallingNoti from "../assets/fallingnoti.svg";
import sleepingNoti from "../assets/sleepingnoti.svg";
import alertImage from "../assets/alert.png";

type NotiType = "alert" | "warning" | "offline" | "normal" | "success" | "info";

type NotiCardProps = {
  type: NotiType;
  title: string;
  titleKey?: string;
  site?: string;
  date?: string | number | Date;
  detail?: string;
  img?: string;
  icon?: React.ReactNode;
  forceDefaultImage?: boolean;
  forceImageOnly?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  className?: string;
};

const cn = (...xs: Array<string | false | undefined>) =>
  xs.filter(Boolean).join(" ");

const formatDate = (d?: string | number | Date) => {
  if (d === undefined || d === null || d === "") return "";
  if (d instanceof Date) {
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  }
  const parsed = new Date(d);
  if (!isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(parsed);
  }
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
    title: "text-[#181D27]",
    meta: "text-[#B8B8B8]",
  },
  normal: {
    root: "bg-[#F8FBFE]",
    border: "border-none",
    iconBg: "",
    title: "text-[#181D27]",
    meta: "text-[#B8B8B8]",
  },
  info: {
    root: "bg-[#F8FBFE]",
    border: "border-none",
    iconBg: "bg-[#AFEAFF]",
    title: "text-[#181D27]",
    meta: "text-[#B8B8B8]",
  },
};

const hasKeyword = (haystack: string, keywords: string[]) =>
  keywords.some((kw) => haystack.includes(kw));

const fallbackImgFor = (
  type: NotiType,
  title: string,
  titleKey?: string,
  strictDefaults = false
) => {
  const normalizedKey = (titleKey || "").toLowerCase();
  const normalizedTitle = (title || "").toLowerCase();
  const blob = `${type} ${normalizedKey} ${normalizedTitle}`;

  if (
    normalizedKey.includes("deviceoffline") ||
    normalizedKey.includes("cameraoffline")
  ) {
    return deviceNoti;
  }

  if (
    hasKeyword(blob, ["fall", "ล้ม", "notis.falldetected"])
  )
    return fallingNoti;
  if (
    hasKeyword(blob, ["sleep", "หลับ", "notis.sleepinglong"])
  )
    return sleepingNoti;
  if (
    hasKeyword(blob, ["offline", "ออฟ", "อุปกรณ์ออฟไลน์", "notis.deviceoffline", "notis.cameraoffline"])
  )
    return deviceNoti;
  if (
    hasKeyword(blob, ["motion", "เคลื่อนไหว", "notis.motiondetected"])
  )
    return motionNoti;
  if (
    hasKeyword(blob, ["fire", "ไฟ", "notis.firedetected"])
  )
    return fireNoti;

  if (!strictDefaults) {
    if (type === "offline") return deviceNoti;
    if (type === "warning") return motionNoti;
    if (type === "alert") return fireNoti;
  }

  return alertImage;
};

const NotiCard: React.FC<NotiCardProps> = ({
  type,
  title,
  titleKey,
  site,
  date,
  detail,
  img,
  icon,
  forceDefaultImage,
  forceImageOnly,
  onClick,
  className,
}) => {
  const p = palette[type as keyof typeof palette] ?? palette.normal;
  const normalizedImg = React.useMemo(
    () => (typeof img === "string" ? img.trim() : ""),
    [img]
  );
  const displayImg = React.useMemo(() => {
    if (forceDefaultImage) {
      return fallbackImgFor(type, title, titleKey, true);
    }
    if (normalizedImg.length) {
      return normalizedImg;
    }
    if (forceImageOnly) return undefined;
    return fallbackImgFor(type, title, titleKey);
  }, [forceDefaultImage, forceImageOnly, normalizedImg, type, title, titleKey]);

  const metaPieces = [
    detail && String(detail).trim(),
    site && String(site).trim(),
    date && formatDate(date),
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
          type !== "normal" && p.iconBg
        )}
      >
        {icon ? (
          icon
        ) : displayImg ? (
          <img width={30} src={displayImg} alt="" />
        ) : forceImageOnly ? null : (
          <img width={30} src={deviceNoti} alt="" />
        )}
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
