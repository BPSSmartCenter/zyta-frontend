import NotificationBell from "../Shared/NotificationBell";

type Props = { title: string };

export default function Navbar({ title }: Props) {
  return (
    <nav className="flex justify-between mt-10 bg-white rounded-full p-8">
      <div className="flex gap-3 items-center">
        <div className="w-[60px] flex items-center justify-center rounded-full bg-[#A9DB4E] w-auto ">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="25"
            height="25"
            viewBox="0 0 24 24"
            fill="white"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-users-icon lucide-users m-4"
            aria-hidden="true"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <path d="M16 3.128a4 4 0 0 1 0 7.744" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <circle cx="9" cy="7" r="4" />
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
