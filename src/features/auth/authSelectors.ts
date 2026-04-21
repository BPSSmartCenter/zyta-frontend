import type { RootState } from "../../store/store";

export const selectAuthUser = (state: RootState) => state.auth.user;

export const selectLoginState = (state: RootState) => ({
  status: state.auth.loginStatus,
  issue: state.auth.loginIssue,
  lastEmail: state.auth.lastLoginEmail,
  resendStatus: state.auth.resendStatus,
});

export const selectRegisterState = (state: RootState) => ({
  status: state.auth.registerStatus,
  registeredEmail: state.auth.registeredEmail,
  emailErrorCode: state.auth.registerEmailError,
  resendStatus: state.auth.resendStatus,
});

export const selectForgotState = (state: RootState) => ({
  status: state.auth.forgotStatus,
  email: state.auth.forgotEmail,
  errorCode: state.auth.forgotErrorCode,
});

export const selectResetState = (state: RootState) => ({
  status: state.auth.resetStatus,
  errorCode: state.auth.resetErrorCode,
});
