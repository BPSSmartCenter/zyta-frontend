import AlertEvents from "./AlertEvents";
import WellBeingEvents from "./WellBeingEvents";
import MapPanel from "./MapPanel";
import UserManagement from "./UserManagement";
import DeviceCount from "./DeviceCount";
import FaceRecognize from "./FaceRecognize";
import ZYTAEvents from "./ZYTAEvents";

type Props = {
  // left column
  searchEvent: string;
  setSearchEvent: (v: string) => void;
  filteredNotis: ReadonlyArray<any>;
  searchWB: string;
  setSearchWB: (v: string) => void;
  filteredWellBeginNotis: ReadonlyArray<any>;
  // middle
  selectedEvents: string[];
  buttonLabel: string;
  toggleEvent: (v: string) => void;
  site: string;
  setSite: (v: string) => void;
  province: string;
  setProvince: (v: string) => void;
  // right
  searchFR: string;
  setSearchFR: (v: string) => void;
  filteredRecognize: ReadonlyArray<any>;

  searchZYTA: string;
  setSearchZYTA: (v: string) => void;
  filterZYTA: ReadonlyArray<any>;
};

export default function ContentLayout(props: Props) {
  const {
    // left
    searchEvent,
    setSearchEvent,
    filteredNotis,
    searchWB,
    setSearchWB,
    filteredWellBeginNotis,
    // middle
    selectedEvents,
    buttonLabel,
    toggleEvent,
    site,
    setSite,
    province,
    setProvince,
    // right
    searchFR,
    setSearchFR,
    filteredRecognize,
    searchZYTA,
    setSearchZYTA,
    filterZYTA,
  } = props;

  return (
    <div className="flex flex-col px-6 gap-3">
      {/* 
        Responsive grid:
        - mobile: 1 col
        - tablet: 2 cols (ซ้าย + กลาง)
        - desktop+: 3 cols: [ซ้ายแคบ] [กลางกว้าง] [ขวาแคบ]
      */}
      <div
        className="
          grid gap-3
          grid-cols-1
          md:grid-cols-2
          lg:[grid-template-columns:370px_minmax(0,1fr)_370px]
        "
      >
        {/* LEFT: All-time Alerts + Well-being (ซ้อนกันในกล่องเดียว) */}
        <div className="p-6 w-full rounded-xl flex flex-col gap-3 bg-white">
          <AlertEvents
            search={searchEvent}
            setSearch={setSearchEvent}
            items={filteredNotis as any[]}
          />
          <WellBeingEvents
            search={searchWB}
            setSearch={setSearchWB}
            items={filteredWellBeginNotis as any[]}
          />
        </div>

        {/* MIDDLE: Map ด้านบน + แถวล่าง UserManagement & Devices */}
        <div className="flex flex-col gap-3 md:col-span-1">
          {/* Map panel */}
          <div className="p-6 w-full rounded-xl bg-white">
            <MapPanel
              selectedEvents={selectedEvents}
              buttonLabel={buttonLabel}
              toggleEvent={toggleEvent}
              site={site}
              setSite={setSite}
              province={province}
              setProvince={setProvince}
            />
          </div>

          {/* Bottom row under the map: User Management (ซ้าย) + Devices (ขวา)
              - บนจอเล็กให้ซ้อนลงมาเป็น 1 คอลัมน์
              - บนจอใหญ่จัด 2 คอลัมน์เคียงกันให้เหมือนภาพ */}
          <div className="grid grid-cols-1 lg-1399:grid-cols-2 gap-3">
            <div className="p-6 w-full rounded-xl bg-white">
              <UserManagement />
            </div>
            <div className="p-6 w-full rounded-xl bg-white">
              <DeviceCount />
            </div>
          </div>
        </div>

        {/* RIGHT: ZYTA Security Alert ด้านบน + Face Recognize/License Plates ด้านล่าง */}
        <div className="flex flex-col gap-3 md:col-span-1">
          <div className="p-6 w-full rounded-xl bg-white">
            <ZYTAEvents
              search={searchZYTA}
              setSearch={setSearchZYTA}
              items={filterZYTA as any[]}
            />
          </div>

          <div className="p-6 w-full rounded-xl bg-white">
            <FaceRecognize
              search={searchFR}
              setSearch={setSearchFR}
              items={filteredRecognize as any[]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
