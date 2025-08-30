// src/components/DonutLegend.tsx
type Item = { label: string; color: string };

type DonutLegendProps = {
  items: Item[];

  // 🔥 เพิ่ม props custom
  className?: string; // ใช้กับ <ul>
  itemClassName?: string; // ใช้กับ <li>
  labelClassName?: string; // ใช้กับ <span> ของข้อความ
};

export default function DonutLegend({
  items,
  className = "",
  itemClassName = "",
  labelClassName = "",
}: DonutLegendProps) {
  return (
    <ul className={`mt-3 space-y-2 text-[13px] ${className}`}>
      {items.map((it) => (
        <li
          key={it.label}
          className={`flex items-center gap-2 text-gray-700 ${itemClassName}`}
        >
          <span
            className="inline-block size-3 rounded-full"
            style={{ backgroundColor: it.color }}
          />
          <span className={labelClassName}>{it.label}</span>
        </li>
      ))}
    </ul>
  );
}
