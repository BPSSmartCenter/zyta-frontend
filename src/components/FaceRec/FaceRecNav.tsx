import LanguagePillSwitcher from "../LanguagePillSwitcher";
import MiniFiltersBar from "../Shared/MiniFiltersBar";

type Props = { title: string };

function UsersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export default function FaceRecNav({ title }: Props) {
  return (
    <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="inline-flex min-w-0 items-center gap-4 rounded-[26px] border border-[#D9EDF9] bg-white px-5 py-4 shadow-[0_14px_34px_rgba(57,184,238,0.10)]">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px] bg-[#E9F9FF] text-[#39B8EE]">
          <UsersIcon />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
            Vision Monitor
          </div>
          <h1 className="mt-1 truncate text-[28px] font-semibold tracking-tight text-slate-950">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 xl:w-auto xl:flex-row">
        <MiniFiltersBar
          page="facerec"
          variant="hero"
          className="min-w-0 flex-1 xl:min-w-[720px]"
        />
        <LanguagePillSwitcher name="facerec-language" />
      </div>
    </div>
  );
}
