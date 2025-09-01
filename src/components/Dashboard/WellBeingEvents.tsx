import SearchInput from "../SearchInput";
import NotiCard from "../notiCard";

type WB = {
  type: string;
  title: string;
  site: string;
  date: string;
  img?: string;
};

type Props = {
  search: string;
  setSearch: (v: string) => void;
  items: WB[];
};

export default function WellBeingEvents({ search, setSearch, items }: Props) {
  return (
    <form className="flex flex-col justify-center py-2 px-3 gap-3">
      <h1 className="text-[22px] font-inter font-semibold text-[#1E1E1E]">
        WELL-BEING ALERTS
      </h1>
      <SearchInput
        value={search}
        placeholder="ช่องค้นหาเหตุการณ์"
        onChange={setSearch}
        className="font-poppins"
      />
      <div className="h-[420px] overflow-y-auto px-2">
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-500">
              ไม่พบเหตุการณ์
            </div>
          ) : (
            items.map((n, i) => (
              <NotiCard
                key={i}
                type={n.type as any}
                title={n.title}
                img={n.img as any}
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
