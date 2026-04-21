import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../store/store";

// ---- raw input selectors ----
const selectAuth = (state: RootState) => state.auth;

export const selectAuthUser = (state: RootState) => state.auth.user;

/** true เมื่อมี user object (เคย login สำเร็จและ session ยังใช้ได้) */
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.user !== null;

/** สถานะการ probe session ตอน boot */
export const selectAuthBootStatus = (state: RootState) =>
  state.auth.bootStatus;

/** true เมื่อยังอยู่ในขั้นตอน probe (ควรแสดง splash screen) */
export const selectIsAuthBooting = (state: RootState) =>
  state.auth.bootStatus === "idle" || state.auth.bootStatus === "booting";

/** error จาก bootstrap (มีค่าเฉพาะตอน bootStatus === "failed") */
export const selectAuthBootError = (state: RootState) =>
  state.auth.bootError;

/**
 * ใช้ createSelector เพื่อ memoize composite objects
 * มิฉะนั้น React-Redux จะเตือน:
 *   "Selector ... returned a different result when called with the same parameters.
 *    This can lead to unnecessary rerenders."
 * เพราะ selector ที่ return object literal จะสร้าง reference ใหม่ทุกครั้ง
 */

export const selectLoginState = createSelector(
  [selectAuth],
  (auth) => ({
    status: auth.loginStatus,
    issue: auth.loginIssue,
    lastEmail: auth.lastLoginEmail,
    resendStatus: auth.resendStatus,
  })
);

export const selectRegisterState = createSelector(
  [selectAuth],
  (auth) => ({
    status: auth.registerStatus,
    registeredEmail: auth.registeredEmail,
    emailErrorCode: auth.registerEmailError,
    resendStatus: auth.resendStatus,
  })
);

export const selectForgotState = createSelector(
  [selectAuth],
  (auth) => ({
    status: auth.forgotStatus,
    email: auth.forgotEmail,
    errorCode: auth.forgotErrorCode,
  })
);

export const selectResetState = createSelector(
  [selectAuth],
  (auth) => ({
    status: auth.resetStatus,
    errorCode: auth.resetErrorCode,
  })
);
