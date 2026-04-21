// src/routes/RequireSiteSelected.tsx
//
// Route guard สำหรับหน้าที่ต้องเลือก "ไซต์ที่จะดูข้อมูล" ก่อน
// - ถ้า selectedSite ยัง null → render placeholder (modal จะบังคับเปิดเองผ่าน slice)
// - ถ้ามี selectedSite → render <Outlet/>

import { Outlet } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import {
  selectHasSiteAccess,
  selectSelectedSite,
} from "../features/siteSelection";

function NoAccessPlaceholder() {
  return (
    <div className="min-h-[60vh] grid place-items-center px-4 py-10">
      <div className="max-w-sm rounded-[8px] border border-slate-200 bg-white p-6 text-center shadow-sm">
        <span className="material-icons-outlined text-[40px] text-slate-300">
          domain_disabled
        </span>
        <h3 className="mt-3 text-base font-semibold text-slate-700">
          ไม่มีสิทธิ์เข้าถึงไซต์
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์การเข้าถึง
        </p>
      </div>
    </div>
  );
}

function WaitingForSelectionPlaceholder() {
  // ว่างไว้เพราะ modal จะครอบ UI อยู่แล้ว
  // ใส่ bg เบา ๆ ให้ไม่เห็น layout ว่างเปล่า
  return <div className="min-h-[60vh] bg-slate-50" aria-hidden="true" />;
}

export default function RequireSiteSelected() {
  const selected = useAppSelector(selectSelectedSite);
  const hasAccess = useAppSelector(selectHasSiteAccess);

  if (!hasAccess) return <NoAccessPlaceholder />;
  if (selected === null) return <WaitingForSelectionPlaceholder />;
  return <Outlet />;
}
