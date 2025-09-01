import SearchInput from "../SearchInput";
import NotiCard from "../notiCard";

type FR = {
  type: any;
  img?: string;
  title: string;
  detail?: string;
  site: string;
  date: string;
};

type Props = {
  search: string;
  setSearch: (v: string) => void;
  items: FR[];
};

export default function FaceRecognize({ search, setSearch, items }: Props) {
  return (
    <form className="flex flex-col justify-center py-2 px-3 gap-3">
      <h1 className="text-[22px] whitespace-nowrap font-inter font-semibold text-[#1E1E1E]">
        Face Recognize / License Plates
      </h1>
      <SearchInput
        value={search}
        placeholder="ช่องค้นหาเหตุการณ์เเจ้งเตือนใบหน้าและทะเบียนรถ"
        onChange={setSearch}
        className="font-poppins"
        inputClassName="placeholder:text-[13px]!"
      />
      <div className="h-[680px] overflow-y-auto px-2">
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="rounded-md px-3 py-2 text-sm text-gray-500">
              ไม่พบเหตุการณ์
            </div>
          ) : (
            items.map((n, i) => (
              <NotiCard
                key={i}
                type={n.type}
                img={n.img}
                title={n.title}
                detail={n.detail}
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
