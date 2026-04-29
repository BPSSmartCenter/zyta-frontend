import type { ReactNode } from "react";
import FaceRecNav from "./FaceRecNav";

type Props = {
  title: string;
  children: ReactNode;
};

export default function FaceRecPageShell({ title, children }: Props) {
  return (
    <div className="bg-[#F8FBFE] p-4">
      <FaceRecNav title={title} />
      {children}
    </div>
  );
}
