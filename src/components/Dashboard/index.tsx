import AlertEvents from "./AlertEvents";
import WellBeingEvents from "./WellBeingEvents";
import MapPanel from "./MapPanel";
import UserManagement from "./UserManagement";
import DeviceCount from "./DeviceCount";
import FaceRecognize from "./FaceRecognize";

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
};

export default function ContentLayout(props: Props) {
  const {
    searchEvent,
    setSearchEvent,
    filteredNotis,
    searchWB,
    setSearchWB,
    filteredWellBeginNotis,
    selectedEvents,
    buttonLabel,
    toggleEvent,
    site,
    setSite,
    province,
    setProvince,
    searchFR,
    setSearchFR,
    filteredRecognize,
  } = props;

  return (
    <div className="flex flex-col px-6 gap-3">
      {/* 
        Responsive grid:
        - mobile: 1 col
        - tablet: 2 cols
        - desktop+: 3 cols
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {/* Left column */}
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

        {/* Middle column */}
        <div className="p-6 w-full rounded-xl flex flex-col gap-3 bg-white">
          <MapPanel
            selectedEvents={selectedEvents}
            buttonLabel={buttonLabel}
            toggleEvent={toggleEvent}
            site={site}
            setSite={setSite}
            province={province}
            setProvince={setProvince}
          />
          <UserManagement />
        </div>

        {/* Right column */}
        <div className="p-6 w-full rounded-xl flex flex-col gap-3 bg-white">
          <DeviceCount />
          <FaceRecognize
            search={searchFR}
            setSearch={setSearchFR}
            items={filteredRecognize as any[]}
          />
        </div>
      </div>
    </div>
  );
}
