import type { ReactNode } from "react";
import FaceRecNav from "./FaceRecNav";

type Props = {
  title: string;
  children: ReactNode;
};

export default function FaceRecPageShell({ title, children }: Props) {
  return (
    <div className="min-h-full bg-[#F4F8FC]">
      <div className="mx-auto w-full max-w-full px-4 pb-10 pt-4 sm:px-6">
        <FaceRecNav title={title} />
        <div className="space-y-5">{children}</div>
      </div>
    </div>
  );
}
