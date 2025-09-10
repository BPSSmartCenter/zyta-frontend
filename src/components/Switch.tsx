import React, { useId } from "react";

export type SwitchProps = React.InputHTMLAttributes<HTMLInputElement> & {
  wrapperClassName?: string;
};

const Switch: React.FC<SwitchProps> = ({
  id,
  className,
  wrapperClassName,
  ...props
}) => {
  const autoId = useId();
  const inputId = id ?? `hs-basic-usage-${autoId}`; // <<— unique per instance

  return (
    <label
      htmlFor={inputId}
      className={[
        "relative inline-block w-11 h-6 cursor-pointer",
        wrapperClassName,
      ].join(" ")}
    >
      <input
        type="checkbox"
        id={inputId}
        className={["peer sr-only", className].join(" ")}
        {...props}
      />
      <span className="absolute inset-0 bg-gray-200 rounded-full transition-colors duration-200 ease-in-out peer-checked:bg-green-500 peer-disabled:opacity-50 peer-disabled:pointer-events-none"></span>
      <span className="absolute top-1/2 start-0.5 -translate-y-1/2 size-5 bg-white rounded-full shadow-xs transition-transform duration-200 ease-in-out peer-checked:translate-x-full"></span>
    </label>
  );
};

export default Switch;
