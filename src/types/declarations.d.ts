// src/declarations.d.ts
declare module "*.svg" {
  import * as React from "react";
  // ใช้กับ vite-plugin-svgr (ถ้ามี) : import { ReactComponent as Icon } from "xxx.svg"
  export const ReactComponent: React.FC<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >;
  // ใช้แบบ import path เป็น string
  const src: string;
  export default src;
}

declare module "*.png" {
  const src: string;
  export default src;
}
declare module "*.jpg" {
  const src: string;
  export default src;
}
declare module "*.jpeg" {
  const src: string;
  export default src;
}
declare module "*.gif" {
  const src: string;
  export default src;
}
declare module "*.webp" {
  const src: string;
  export default src;
}
declare module "*.bmp" {
  const src: string;
  export default src;
}
declare module "*.ico" {
  const src: string;
  export default src;
}

declare module "*.css";
declare module "*.scss";
