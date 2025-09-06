import React, { useEffect, useMemo, useRef, useState } from "react";

type Option = { label: string; value: string };

type RenderCtx = {
  open: boolean;
  toggle: () => void;
  setOpen: (next: boolean) => void;

  value: string;
  selected?: Option;
  pick: (opt: Option) => void;

  options: Option[];

  getButtonProps: (
    extra?: React.ButtonHTMLAttributes<HTMLButtonElement>
  ) => React.ButtonHTMLAttributes<HTMLButtonElement>;
  getMenuProps: (
    extra?: React.HTMLAttributes<HTMLDivElement>
  ) => React.HTMLAttributes<HTMLDivElement>;
  getItemProps: (
    opt: Option,
    extra?: React.ButtonHTMLAttributes<HTMLButtonElement>
  ) => React.ButtonHTMLAttributes<HTMLButtonElement>;
};

type Props = {
  options: Option[];
  value?: string;
  onChange?: (value: string, option: Option) => void;

  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  id?: string;
  children: (ctx: RenderCtx) => React.ReactNode;
};

function DropdownBase({
  options,
  value,
  onChange,
  isOpen,
  onOpenChange,
  id = "dropdown",
  children,
}: Props) {
  const [openUncontrolled, setOpenUncontrolled] = useState(false);
  const open = isOpen ?? openUncontrolled;

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

  // ใส่/ถอดแฟล็กที่ body เพื่อล็อก breakpoint/resize ชั่วคราวตอนเมนูเปิด
  useEffect(() => {
    const cls = "dropdown-inline-open";
    if (open) document.body.classList.add(cls);
    else document.body.classList.remove(cls);
    return () => document.body.classList.remove(cls);
  }, [open]);

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

// dropdown ไม่ต้อง re-render จาก parent ทุกเรื่อง: memo ไว้
const Dropdown = React.memo(DropdownBase);
export default Dropdown;
