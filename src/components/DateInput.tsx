import { useEffect, useMemo, useRef, useState } from "react";

/** ── รูปแบบวันที่ที่ส่งออก/รับเข้า (ไม่ใช้ ISO string) ── */
export type DateValue = { y: number; m: number; d: number }; // m = 1..12

/** utils เล็ก ๆ (ไม่ผูกกับ ISO) */
const pad = (n: number) => String(n).padStart(2, "0");
const toLabel = (v?: DateValue) =>
  v ? `${v.y}-${pad(v.m)}-${pad(v.d)}` : "YYYY-MM-DD"; // แค่ไว้โชว์
const toDate = (v: DateValue) => new Date(v.y, v.m - 1, v.d);
const fromDate = (d: Date): DateValue => ({
  y: d.getFullYear(),
  m: d.getMonth() + 1,
  d: d.getDate(),
});
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

type Props = {
  value?: DateValue; // ค่าปัจจุบัน (object)
  onChange?: (v: DateValue) => void; // จุดต่อ API: ถูกเรียกเมื่อเลือกวันใหม่
  min?: DateValue; // จำกัดช่วง (ไม่บังคับ)
  max?: DateValue;
  className?: string;
  placeholder?: string;
};

export default function DatePicker({
  value,
  onChange,
  min,
  max,
  className = "",
  placeholder = "YYYY-MM-DD",
}: Props) {
  const today = useMemo(() => fromDate(new Date()), []);
  const selected = value;
  const [cursor, setCursor] = useState<Date>(() => toDate(selected ?? today)); // เดือนที่กำลังดู
  useEffect(() => {
    if (selected) setCursor(toDate(selected));
  }, [selected]);

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const minD = min ? toDate(min) : undefined;
  const maxD = max ? toDate(max) : undefined;

  const grid = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const firstDayMon0 = (first.getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevMonthDays = new Date(y, m, 0).getDate();

    const cells: { date: Date; current: boolean }[] = [];
    for (let i = firstDayMon0; i > 0; i--)
      cells.push({
        date: new Date(y, m - 1, prevMonthDays - i + 1),
        current: false,
      });
    for (let d = 1; d <= daysInMonth; d++)
      cells.push({ date: new Date(y, m, d), current: true });
    while (cells.length < 42) {
      const last = cells[cells.length - 1].date;
      const next = new Date(last);
      next.setDate(last.getDate() + 1);
      cells.push({ date: next, current: false });
    }
    return cells;
  }, [cursor]);

  const isDisabled = (d: Date) => {
    if (
      minD &&
      d < new Date(minD.getFullYear(), minD.getMonth(), minD.getDate())
    )
      return true;
    if (
      maxD &&
      d > new Date(maxD.getFullYear(), maxD.getMonth(), maxD.getDate())
    )
      return true;
    return false;
  };

  const pick = (d: Date) => {
    if (isDisabled(d)) return;
    onChange?.(fromDate(d));
    setOpen(false);
  };

  const gotoPrev = () => {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() - 1);
    setCursor(d);
  };
  const gotoNext = () => {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() + 1);
    setCursor(d);
  };

  const monthLabel = cursor.toLocaleString("en-US", { month: "short" });
  const yearLabel = cursor.getFullYear();

  return (
    <div ref={wrapRef} className={`relative inline-block`}>
      {/* ปุ่มหลัก */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`h-[40px] w-[240px] rounded-md border border-gray-300 bg-white
                   pl-3 pr-10 text-gray-800 flex  items-center justify-center
                   focus:outline-none focus:bg-gray-50 hover:cursor-pointer ${className}`}
      >
        <span className="truncate">
          {value ? toLabel(value) : placeholder}{" "}
        </span>
        <i className="material-icons absolute right-2  text-gray-300 ">
          calendar_today
        </i>
      </button>

      {/* ปฏิทิน */}
      {open && (
        <div className="absolute z-50 mt-2 w-[240px] rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
          {/* Header */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={gotoPrev}
              className="size-8 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 hover:cursor-pointer"
              aria-label="Previous month"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <div className="text-sm font-medium text-gray-800 hover:cursor-default">
              {monthLabel} {yearLabel}
            </div>
            <button
              type="button"
              onClick={gotoNext}
              className="size-8 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 hover:cursor-pointer"
              aria-label="Next month"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Labels */}
          <div className="grid grid-cols-7 gap-y-1 pb-1 text-center text-xs text-gray-500 hover:cursor-default">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {grid.map(({ date, current }, i) => {
              const isSel = selected ? sameDay(toDate(selected), date) : false;
              const isToday = sameDay(toDate(today), date);
              const disabled = isDisabled(date);
              return (
                <button
                  key={date.toDateString() + i}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(date)}
                  className={[
                    "m-px size-7 rounded-none text-sm flex items-center justify-center hover:cursor-pointer",
                    current ? "text-gray-800" : "text-gray-400",
                    isSel
                      ? "bg-[#1890FF] text-white font-medium"
                      : "hover:border-blue-600 hover:text-blue-600 border border-transparent",
                    isToday && !isSel ? "ring-1 ring-blue-500/40" : "",
                    disabled
                      ? "opacity-40 cursor-not-allowed hover:text-inherit hover:border-transparent"
                      : "",
                  ].join(" ")}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Today */}
          <button
            type="button"
            onClick={() => {
              onChange?.(today);
              setCursor(toDate(today));
              setOpen(false);
            }}
            className="mt-2 w-full text-center text-sm text-blue-600 hover:text-[#1890FF] hover:cursor-pointer"
          >
            Today
          </button>
        </div>
      )}
    </div>
  );
}
