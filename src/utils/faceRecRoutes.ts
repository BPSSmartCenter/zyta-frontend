import { resolveFaceRecKind } from "./notis";

export type FaceRecPageKind = "face" | "plate";

export const FACE_RECOGNIZE_PATH = "/facerec";
export const LICENSE_PLATES_PATH = "/license-plates";

export const resolveFaceRecPageKind = (input?: unknown): FaceRecPageKind =>
  resolveFaceRecKind(input as any) === "plate" ? "plate" : "face";

export const resolveFaceRecPath = (input?: unknown): string =>
  resolveFaceRecPageKind(input) === "plate"
    ? LICENSE_PLATES_PATH
    : FACE_RECOGNIZE_PATH;
