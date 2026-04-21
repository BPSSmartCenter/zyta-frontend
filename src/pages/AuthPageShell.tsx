import type { ReactNode } from "react";
import brandImage from "../assets/brand.png";

type AuthPageShellProps = {
  title: ReactNode;
  subtitle: ReactNode;
  children: ReactNode;
  maxWidthClassName?: string;
};

export default function AuthPageShell({
  title,
  subtitle,
  children,
  maxWidthClassName = "max-w-[448px]",
}: AuthPageShellProps) {
  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#123A42] px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(120deg,rgba(58,184,238,0.22),transparent_38%),linear-gradient(45deg,rgba(22,163,74,0.18),transparent_42%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:44px_44px]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgba(245,248,251,0.18))]"
      />
      <main className={`relative z-10 w-full ${maxWidthClassName}`}>
        <div className="w-full rounded-[8px] border border-white/70 bg-white px-5 py-7 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:px-8 sm:py-9">
          <div className="mb-8 flex flex-col items-center text-center sm:mb-9">
            <div className="mb-5 grid h-20 w-20 place-items-center rounded-[8px] border border-slate-100 bg-white shadow-sm sm:h-24 sm:w-24">
              <img
                className="h-16 w-16 object-contain sm:h-20 sm:w-20"
                src={brandImage}
                alt="BPS"
              />
            </div>
            <h1 className="text-[25px] font-bold leading-tight text-slate-950 sm:text-[29px]">
              {title}
            </h1>
            <p className="mt-3 max-w-[340px] text-sm leading-6 text-slate-500 sm:text-base">
              {subtitle}
            </p>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}
