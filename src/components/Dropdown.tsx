import React, { useEffect, useMemo, useRef, useState } from "react";

type Option = { label: string; value: string };

type RenderCtx = {
  /** สถานะเปิด/ปิดเมนู */
  open: boolean;
  /** toggle เปิด/ปิด */
  toggle: () => void;
  /** ตั้งค่าสถานะเปิด/ปิด (รองรับ controlled/uncontrolled) */
  setOpen: (next: boolean) => void;

  /** ค่า value ปัจจุบัน (คุมได้ทั้ง controlled/uncontrolled) */
  value: string;
  /** option ที่ถูกเลือกอยู่ */
  selected?: Option;
  /** เลือก option */
  pick: (opt: Option) => void;

  /** รายการ options ทั้งหมด (ให้ children map ใช้ได้สะดวก) */
  options: Option[];

  /** prop-getters: ช่วยประกอบ a11y/behavior ได้ง่าย */
  getButtonProps: (extra?: React.ButtonHTMLAttributes<HTMLButtonElement>) => React.ButtonHTMLAttributes<HTMLButtonElement>;
  getMenuProps: (extra?: React.HTMLAttributes<HTMLDivElement>) => React.HTMLAttributes<HTMLDivElement>;
  getItemProps: (
    opt: Option,
    extra?: React.ButtonHTMLAttributes<HTMLButtonElement>
  ) => React.ButtonHTMLAttributes<HTMLButtonElement>;
};

type Props = {
  options: Option[];
  value?: string;
  onChange?: (value: string, option: Option) => void;

  /** ควบคุมสถานะเปิดจากภายนอก (controlled) */
  isOpen?: boolean;
  /** แจ้งเมื่อสถานะเปิด/ปิดเปลี่ยน */
  onOpenChange?: (open: boolean) => void;

  /** ใช้จับคู่กับ aria-labelledby ของเมนู */
  id?: string;

  /** render props */
  children: (ctx: RenderCtx) => React.ReactNode;
};

export default function Dropdown({
  options,
  value,
  onChange,
  isOpen,
  onOpenChange,
  id = "all-sites-dropdown",
  children,
}: Props) {
  // รองรับทั้ง controlled และ uncontrolled สำหรับ open
  const [openUncontrolled, setOpenUncontrolled] = useState(false);
  const open = isOpen ?? openUncontrolled;

  // รองรับทั้ง controlled และ uncontrolled สำหรับ value
  const [internal, setInternal] = useState(value ?? "");
  useEffect(() => {
    if (value !== undefined) setInternal(value);
  }, [value]);
  const currentValue = value ?? internal;

  const selected = useMemo(
    () => options.find((o) => o.value === currentValue),
    [options, currentValue]
  );

  const rootRef = useRef<HTMLDivElement>(null);

  // ปิดเมื่อคลิกนอก (เฉพาะกรณี uncontrolled)
  useEffect(() => {
    if (!open || isOpen !== undefined) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpenUncontrolled(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, isOpen]);

  const setOpen = (next: boolean) => {
    if (isOpen === undefined) setOpenUncontrolled(next);
    onOpenChange?.(next);
  };

  const toggle = () => setOpen(!open);

  const pick = (opt: Option) => {
    if (value === undefined) setInternal(opt.value);
    onChange?.(opt.value, opt);
    setOpen(false);
  };

  // prop-getters (ช่วยให้ children ใส่ a11y/behavior ได้ไว)
  const getButtonProps: RenderCtx["getButtonProps"] = (extra) => ({
    id,
    type: "button",
    "aria-haspopup": "menu",
    "aria-expanded": open,
    onClick: (e) => {
      extra?.onClick?.(e);
      toggle();
    },
    ...extra,
  });

  const getMenuProps: RenderCtx["getMenuProps"] = (extra) => ({
    role: "menu",
    "aria-labelledby": id,
    ...extra,
  });

  const getItemProps: RenderCtx["getItemProps"] = (opt, extra) => ({
    role: "menuitem",
    "aria-selected": opt.value === currentValue,
    onClick: (e) => {
      extra?.onClick?.(e);
      pick(opt);
    },
    ...extra,
  });

  return (
    <div ref={rootRef} className="relative inline-flex">
      {children({
        open,
        toggle,
        setOpen,
        value: currentValue,
        selected,
        pick,
        options,
        getButtonProps,
        getMenuProps,
        getItemProps,
      })}
    </div>
  );
}
