import NotificationBell from "../Shared/NotificationBell";

type Props = { title: string };

export default function Navbar({ title }: Props) {
  return (
    <nav className="flex justify-between mt-10 bg-white rounded-full p-8">
      <div className="flex gap-3 items-center">
        <div className="w-[60px] h-[60px] flex items-center justify-center rounded-full bg-[#A9DB4E]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="36"
            viewBox="0 0 28 36"
            aria-hidden="true"
          >
            <path
              d="M14 0c7.732 0 14 6.268 14 14 0 9.941-14 22-14 22S0 23.941 0 14C0 6.268 6.268 0 14 0z"
              fill="#FFFFFF"
            />
            <circle cx="14" cy="13.5" r="5" fill="#A9DB4E" />
          </svg>
        </div>
        <h1 className="text-[19px] md:text-2xl font-semibold">{title}</h1>
      </div>

      <div className="gap-6 flex items-center">
        <NotificationBell />
      </div>
    </nav>
  );
}
