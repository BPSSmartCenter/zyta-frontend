import searchIcon from "../assets/search.png";

type Props = {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
};

export default function SearchInput({
  value,
  onChange,
  placeholder = "ช่องค้นหา sites",
  className = "",
  inputClassName = "",
}: Props) {
  return (
    <label className={`relative inline-block ${className}`}>
      {/* ไอคอนแว่นขยาย */}
      <img
        src={searchIcon}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-[17px] text-gray-400"
        alt=""
      />

      {/* กล่อง input */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={`h-[40px] w-full font-inter               
        rounded-md border border-gray-300 
          bg-white
          pl-9 pr-3                     
          text-[14px] leading-none
          placeholder:text-gray-400
          focus:outline-none focus:ring-2 ${inputClassName}`}
      />
      <span className="sr-only">ค้นหา</span>
    </label>
  );
}
