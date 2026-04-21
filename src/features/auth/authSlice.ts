import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  AuthRejectValue,
  AuthUser,
  LoginIssue,
  RequestStatus,
} from "./authTypes";
import {
  forgotPassword,
  loginWithCredentials,
  registerAccount,
  resendVerificationEmail,
  resetPassword,
} from "./authThunks";

type AuthState = {
  user: AuthUser | null;
  loginStatus: RequestStatus;
  loginIssue: LoginIssue | null;
  lastLoginEmail: string;
  registerStatus: RequestStatus;
  registeredEmail: string;
  registerEmailError: string | null;
  forgotStatus: RequestStatus;
  forgotEmail: string;
  forgotErrorCode: AuthRejectValue["code"] | null;
  resetStatus: RequestStatus;
  resetErrorCode: AuthRejectValue["code"] | null;
  resendStatus: RequestStatus;
};

const initialState: AuthState = {
  user: null,
  loginStatus: "idle",
  loginIssue: null,
  lastLoginEmail: "",
  registerStatus: "idle",
  registeredEmail: "",
  registerEmailError: null,
  forgotStatus: "idle",
  forgotEmail: "",
  forgotErrorCode: null,
  resetStatus: "idle",
  resetErrorCode: null,
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
      state.resendStatus = "idle";
    },
    clearLoginFeedback(state) {
      state.loginIssue = null;
      state.loginStatus = "idle";
      state.resendStatus = "idle";
    },
    clearRegisterFeedback(state) {
      state.registerStatus = "idle";
      state.registeredEmail = "";
      state.registerEmailError = null;
      state.resendStatus = "idle";
    },
    clearRegisterEmailError(state) {
      state.registerEmailError = null;
      if (state.registerStatus === "failed") {
        state.registerStatus = "idle";
      }
    },
    clearForgotFeedback(state) {
      state.forgotStatus = "idle";
      state.forgotEmail = "";
      state.forgotErrorCode = null;
    },
    clearResetFeedback(state) {
      state.resetStatus = "idle";
      state.resetErrorCode = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginWithCredentials.pending, (state, action) => {
        state.loginStatus = "pending";
        state.loginIssue = null;
        state.lastLoginEmail = action.meta.arg.email.trim();
      })
      .addCase(loginWithCredentials.fulfilled, (state, action) => {
        state.loginStatus = "succeeded";
        state.loginIssue = null;
        state.user = action.payload;
      })
      .addCase(loginWithCredentials.rejected, (state, action) => {
        state.loginStatus = "failed";
        state.loginIssue = toLoginIssue(action.payload);
      })
      .addCase(registerAccount.pending, (state) => {
        state.registerStatus = "pending";
        state.registeredEmail = "";
        state.registerEmailError = null;
      })
      .addCase(registerAccount.fulfilled, (state, action) => {
        state.registerStatus = "succeeded";
        state.registeredEmail = action.payload.email;
      })
      .addCase(registerAccount.rejected, (state, action) => {
        state.registerStatus = "failed";
        if (action.payload?.code === "EMAIL_ALREADY_EXISTS") {
          state.registerEmailError = "EMAIL_ALREADY_EXISTS";
        }
      })
      .addCase(forgotPassword.pending, (state) => {
        state.forgotStatus = "pending";
        state.forgotEmail = "";
        state.forgotErrorCode = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.forgotStatus = "succeeded";
        state.forgotEmail = action.payload.email;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.forgotStatus = "failed";
        state.forgotErrorCode = action.payload?.code ?? "UNKNOWN";
      })
      .addCase(resetPassword.pending, (state) => {
        state.resetStatus = "pending";
        state.resetErrorCode = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.resetStatus = "succeeded";
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.resetStatus = "failed";
        state.resetErrorCode = action.payload?.code ?? "UNKNOWN";
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
