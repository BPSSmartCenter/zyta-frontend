// src/mocks/jwt.ts
// ---- ultra-simple JWT mock (base64 json; ไม่ได้เซ็นจริง ใช้เดโมเท่านั้น) ----

export type JwtPayload = {
  sub: string; // user id
  role: "admin" | "officer" | "user";
  site_ids: string[];
  exp: number; // epoch seconds
};

export function encodeMockJwt(payload: JwtPayload): string {
  const header = { alg: "none", typ: "JWT" };
  const b64 = (obj: any) => btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  return `${b64(header)}.${b64(payload)}.`; // ไม่มี signature
}

export function decodeMockJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split(".");
    const json = JSON.parse(decodeURIComponent(escape(atob(payload))));
    return json;
  } catch {
    return null;
  }
}
