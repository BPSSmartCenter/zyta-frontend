// src/components/notiCard.tsx
import React from "react";
import fireNoti from "../assets/firenoti.svg";
import motionNoti from "../assets/motionnoti.svg";
import deviceNoti from "../assets/devicenoti.svg";
import fallingNoti from "../assets/fallingnoti.svg";
import sleepingNoti from "../assets/sleepingnoti.svg";
import alertImage from "../assets/alert.png";
import faceImage from "../assets/face.png";
import plateImage from "../assets/plate.png";
import { resolveAlertEventKey } from "../utils/notis";

type NotiType = "alert" | "warning" | "offline" | "normal" | "success" | "info";

type NotiCardProps = {
  type: NotiType;
  title: string;
  titleKey?: string;
  eventHint?: string;
  site?: string;
  date?: string | number | Date;
  detail?: string;
  img?: string;
  icon?: React.ReactNode;
  forceDefaultImage?: boolean;
  forceImageOnly?: boolean;
  meta?: Record<string, unknown> | null;
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
    iconBg: "bg-[#00bcff]",
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
  strictDefaults = false,
  meta?: Record<string, unknown> | null,
  detail?: string,
  eventHint?: string
) => {
  const normalizedKey = (titleKey || "").toLowerCase();
  const normalizedTitle = (title || "").toLowerCase();
  const normalizedDetail = (detail || "").toLowerCase();
  const blob = `${type} ${normalizedKey} ${normalizedTitle} ${normalizedDetail}`;

  const detectedEvent = resolveAlertEventKey({
    titleKey,
    title,
    detail,
    type,
    event: eventHint,
    meta: meta ?? undefined,
  } as any);
  if (detectedEvent) {
    if (detectedEvent === "fire") return fireNoti;
    if (detectedEvent === "motion") return motionNoti;
    if (detectedEvent === "offline") return deviceNoti;
    if (detectedEvent === "fall") return fallingNoti;
    if (detectedEvent === "sleep") return sleepingNoti;
    if (detectedEvent === "face") return faceImage;
    if (detectedEvent === "plate") return plateImage;
  }

  if (
    normalizedKey.includes("deviceoffline") ||
    normalizedKey.includes("cameraoffline")
  ) {
    return deviceNoti;
  }

  if (hasKeyword(blob, ["fall", "ล้ม", "notis.falldetected"]))
    return fallingNoti;
  if (hasKeyword(blob, ["face", "notis.facedetected", "จดจำใบหน้า"]))
    return faceImage;
  if (
    hasKeyword(blob, ["plate", "license", "notis.platedetected", "ทะเบียน"])
  )
    return plateImage;
  if (hasKeyword(blob, ["sleep", "หลับ", "notis.sleepinglong"]))
    return sleepingNoti;
  if (
    hasKeyword(blob, [
      "offline",
      "ออฟ",
      "อุปกรณ์ออฟไลน์",
      "notis.deviceoffline",
      "notis.cameraoffline",
    ])
  )
    return deviceNoti;
  if (hasKeyword(blob, ["motion", "เคลื่อนไหว", "notis.motiondetected"]))
    return motionNoti;
  if (hasKeyword(blob, ["fire", "ไฟ", "notis.firedetected"])) return fireNoti;

  if (!strictDefaults) {
    if (type === "offline") return deviceNoti;
    if (type === "warning") return motionNoti;
    if (type === "alert") return fireNoti;
  }

  return alertImage;
};

const overrideTypes = new Set<NotiType>(["alert", "warning"]);

const NotiCard: React.FC<NotiCardProps> = ({
  type,
  title,
  titleKey,
  eventHint,
  site,
  date,
  detail,
  img,
  icon,
  forceDefaultImage,
  forceImageOnly,
  meta,
  onClick,
  className,
}) => {
  const p = palette[type as keyof typeof palette] ?? palette.normal;
  const normalizedImg = React.useMemo(
    () => (typeof img === "string" ? img.trim() : ""),
    [img]
  );
  const displayImg = React.useMemo(() => {
    const useProvided =
      typeof normalizedImg === "string" &&
      normalizedImg.length > 0 &&
      overrideTypes.has(type);

    if (forceDefaultImage && !useProvided) {
      return fallbackImgFor(
        type,
        title,
        titleKey,
        true,
        meta ?? undefined,
        detail,
        eventHint
      );
    }
    if (normalizedImg.length) {
      return normalizedImg;
    }
    if (forceImageOnly) return undefined;
    return fallbackImgFor(
      type,
      title,
      titleKey,
      false,
      meta ?? undefined,
      detail,
      eventHint
    );
  }, [
    forceDefaultImage,
    forceImageOnly,
    normalizedImg,
    type,
    title,
    titleKey,
    meta,
    detail,
    eventHint,
  ]);

  const metaPieces = [
    detail && String(detail).trim(),
    site && String(site).trim(),
  ].filter(Boolean) as string[];

  const formattedDate = date ? formatDate(date) : "";

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
          p.iconBg
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

      <div className="flex min-w-0 flex-1 flex-col gap-0">
        <div
          className={cn("truncate text-[13px] font-bold leading-5", p.title)}
        >
          {title}
        </div>
        {metaPieces.length > 0 && (
          <div
            className={cn(
              "truncate text-[12px] font-semibold leading-4 mt-1",
              p.meta
            )}
          >
            {metaPieces.join(" - ")}
          </div>
        )}

        {formattedDate && (
          <div
            className={cn("truncate text-[12px] font-medium leading-3", p.meta)}
          >
            {formattedDate}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotiCard;
