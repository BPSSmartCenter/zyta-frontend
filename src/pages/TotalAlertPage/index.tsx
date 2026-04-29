import Content from "../../components/TotalAlert/Content";
import Table from "../../components/TotalAlert/Table";
import { statItems } from "../../components/Dashboard/dashboard.constants";

export default function TotalAlert() {
  return (
    <div className="min-h-screen bg-[#F5F7FB] px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
      <div className="flex flex-col gap-5">
        <Content statItems={statItems} />
        <Table />
      </div>
    </div>
  );
}
