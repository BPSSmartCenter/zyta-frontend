export { default as authReducer, authActions } from "./authSlice";
export type { AuthBootStatus } from "./authSlice";
export {
  bootstrapAuth,
  forgotPassword,
  loginWithCredentials,
  logoutUser,
  registerAccount,
  resendVerificationEmail,
  resetPassword,
  verifyEmail,
} from "./authThunks";
export {
  registerAccountApi,
  loginApi,
  logoutApi,
  resendVerificationApi,
  verifyEmailApi,
  checkEmailExistsApi,
  requestPasswordResetApi,
  resetPasswordApi,
} from "./authApi";
export {
  selectAuthBootError,
  selectAuthBootStatus,
  selectAuthUser,
  selectForgotState,
  selectIsAuthBooting,
  selectIsAuthenticated,
  selectLoginState,
  selectRegisterState,
  selectResetState,
} from "./authSelectors";
export {
  analyzeAuthError,
  createAuthErrorHandler,
  AuthErrorHandler,
  type AuthErrorHandler as IAuthErrorHandler,
} from "./authErrorUtils";
export type {
  AuthErrorResponse,
  AuthRejectValue,
  AuthUser,
  ErrorCategory,
  ForgotPasswordInput,
  LoginCredentials,
  LoginIssue,
  RegisterAccountInput,
  RequestStatus,
  ResetPasswordInput,
} from "./authTypes";
export { AUTH_ERROR_CODES, categorizeAuthError } from "./authTypes";
