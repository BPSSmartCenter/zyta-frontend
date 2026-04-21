import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  AuthErrorResponse,
  AuthRejectValue,
  AuthUser,
  LoginIssue,
  RequestStatus,
} from "./authTypes";
import {
  bootstrapAuth,
  forgotPassword,
  loginWithCredentials,
  registerAccount,
  resendVerificationEmail,
  resetPassword,
} from "./authThunks";

/**
 * bootStatus: สถานะการ probe session ตอน app boot
 * - "idle"   : ยังไม่ได้ probe (ก่อน dispatch bootstrapAuth)
 * - "booting": กำลัง probe /users/me อยู่
 * - "ready"  : probe เสร็จแล้ว (มีหรือไม่มี user ก็จบขั้นตอน boot)
 * - "failed" : probe error (network/server issue) — ควรแสดง retry UI
 */
export type AuthBootStatus = "idle" | "booting" | "ready" | "failed";

type AuthState = {
  user: AuthUser | null;
  bootStatus: AuthBootStatus;
  bootError: AuthErrorResponse | null;
  loginStatus: RequestStatus;
  loginIssue: LoginIssue | null;
  lastLoginEmail: string;
  lastLoginError: AuthErrorResponse | null;
  registerStatus: RequestStatus;
  registeredEmail: string;
  registerEmailError: string | null;
  lastRegisterError: AuthErrorResponse | null;
  forgotStatus: RequestStatus;
  forgotEmail: string;
  forgotErrorCode: AuthRejectValue["code"] | null;
  lastForgotError: AuthErrorResponse | null;
  resetStatus: RequestStatus;
  resetErrorCode: AuthRejectValue["code"] | null;
  lastResetError: AuthErrorResponse | null;
  resendStatus: RequestStatus;
};

const initialState: AuthState = {
  user: null,
  bootStatus: "idle",
  bootError: null,
  loginStatus: "idle",
  loginIssue: null,
  lastLoginEmail: "",
  lastLoginError: null,
  registerStatus: "idle",
  registeredEmail: "",
  registerEmailError: null,
  lastRegisterError: null,
  forgotStatus: "idle",
  forgotEmail: "",
  forgotErrorCode: null,
  lastForgotError: null,
  resetStatus: "idle",
  resetErrorCode: null,
  lastResetError: null,
  resendStatus: "idle",
};

function toLoginIssue(payload?: AuthRejectValue): LoginIssue {
  if (payload?.code === "ACCOUNT_INACTIVE") return "inactive";
  if (payload?.code === "EMAIL_NOT_VERIFIED") return "notVerified";
  return "generic";
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
    },
    clearAuthUser(state) {
      state.user = null;
      state.loginStatus = "idle";
      state.loginIssue = null;
      state.lastLoginError = null;
      state.resendStatus = "idle";
    },
    clearLoginFeedback(state) {
      state.loginIssue = null;
      state.loginStatus = "idle";
      state.lastLoginError = null;
      state.resendStatus = "idle";
    },
    clearRegisterFeedback(state) {
      state.registerStatus = "idle";
      state.registeredEmail = "";
      state.registerEmailError = null;
      state.lastRegisterError = null;
      state.resendStatus = "idle";
    },
    clearRegisterEmailError(state) {
      state.registerEmailError = null;
      state.lastRegisterError = null;
      if (state.registerStatus === "failed") {
        state.registerStatus = "idle";
      }
    },
    clearForgotFeedback(state) {
      state.forgotStatus = "idle";
      state.forgotEmail = "";
      state.forgotErrorCode = null;
      state.lastForgotError = null;
    },
    clearResetFeedback(state) {
      state.resetStatus = "idle";
      state.resetErrorCode = null;
      state.lastResetError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ---- Bootstrap (probe session ตอน app boot) ----
      .addCase(bootstrapAuth.pending, (state) => {
        state.bootStatus = "booting";
        state.bootError = null;
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.bootStatus = "ready";
        state.bootError = null;
        // payload = AuthUser | null
        // null = ยังไม่ได้ login (ไม่ใช่ error)
        state.user = action.payload;
      })
      .addCase(bootstrapAuth.rejected, (state, action) => {
        // ถึงตรงนี้เมื่อเป็น network/server error จริง ๆ เท่านั้น
        // (401/403 ถูก handle เป็น fulfilled(null) ใน thunk)
        state.bootStatus = "failed";
        state.bootError = action.payload || null;
        state.user = null;
      })
      // ---- Login ----
      .addCase(loginWithCredentials.pending, (state, action) => {
        state.loginStatus = "pending";
        state.loginIssue = null;
        state.lastLoginError = null;
        state.lastLoginEmail = action.meta.arg.email.trim();
      })
      .addCase(loginWithCredentials.fulfilled, (state, action) => {
        state.loginStatus = "succeeded";
        state.loginIssue = null;
        state.lastLoginError = null;
        state.user = action.payload;
      })
      .addCase(loginWithCredentials.rejected, (state, action) => {
        state.loginStatus = "failed";
        state.lastLoginError = action.payload || null;
        state.loginIssue = toLoginIssue(action.payload);
      })
      .addCase(registerAccount.pending, (state) => {
        state.registerStatus = "pending";
        state.registeredEmail = "";
        state.registerEmailError = null;
        state.lastRegisterError = null;
      })
      .addCase(registerAccount.fulfilled, (state, action) => {
        state.registerStatus = "succeeded";
        state.registeredEmail = action.payload.email;
        state.lastRegisterError = null;
      })
      .addCase(registerAccount.rejected, (state, action) => {
        state.registerStatus = "failed";
        state.lastRegisterError = action.payload || null;
        if (action.payload?.code === "EMAIL_ALREADY_EXISTS") {
          state.registerEmailError = "EMAIL_ALREADY_EXISTS";
        }
      })
      .addCase(forgotPassword.pending, (state) => {
        state.forgotStatus = "pending";
        state.forgotEmail = "";
        state.forgotErrorCode = null;
        state.lastForgotError = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.forgotStatus = "succeeded";
        state.forgotEmail = action.payload.email;
        state.lastForgotError = null;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.forgotStatus = "failed";
        state.forgotErrorCode = action.payload?.code ?? "UNKNOWN";
        state.lastForgotError = action.payload || null;
      })
      .addCase(resetPassword.pending, (state) => {
        state.resetStatus = "pending";
        state.resetErrorCode = null;
        state.lastResetError = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.resetStatus = "succeeded";
        state.lastResetError = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.resetStatus = "failed";
        state.resetErrorCode = action.payload?.code ?? "UNKNOWN";
        state.lastResetError = action.payload || null;
      })
      .addCase(resendVerificationEmail.pending, (state) => {
        state.resendStatus = "pending";
      })
      .addCase(resendVerificationEmail.fulfilled, (state) => {
        state.resendStatus = "succeeded";
      })
      .addCase(resendVerificationEmail.rejected, (state) => {
        state.resendStatus = "failed";
      });
  },
});

export const authActions = authSlice.actions;
export default authSlice.reducer;
