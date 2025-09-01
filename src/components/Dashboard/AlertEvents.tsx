import SearchInput from "../SearchInput";
import NotiCard from "../notiCard";

type Noti = { type: string; title: string; site: string; date: string };

type Props = {
  search: string;
  setSearch: (v: string) => void;
  items: Noti[];
};

export default function AlertEvents({ search, setSearch, items }: Props) {
  return (
    <form className="flex flex-col justify-center py-2 px-3 gap-3">
      <h1 className="text-[22px] font-inter font-semibold text-[#1E1E1E]">
        ALL-TIME ALERTS
      </h1>
      <SearchInput
        value={search}
        placeholder="ช่องค้นหาเหตุการณ์"
        onChange={setSearch}
        className="font-poppins"
      />
      <div className="h-[590px] overflow-y-auto px-2">
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="rounded-md px-3 py-2 text-sm text-gray-500">
              ไม่พบเหตุการณ์
            </div>
          ) : (
            items.map((n, i) => (
              <NotiCard
                key={i}
                type={n.type as any}
                title={n.title}
                site={n.site}
                date={n.date}
              />
            ))
          )}
        </div>
      </div>
    </form>
  );
}
