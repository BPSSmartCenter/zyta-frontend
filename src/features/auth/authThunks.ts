import { createAsyncThunk } from "@reduxjs/toolkit";
import { isAxiosError } from "axios";
import {
  checkEmailExists,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  requestPasswordReset,
  resendVerification,
  resetPassword as apiResetPassword,
} from "../../api/auth";
import { me as apiMe } from "../../api/user";
import {
  AUTH_ERROR_CODES,
  type AuthRejectValue,
  type AuthUser,
  type ForgotPasswordInput,
  type LoginCredentials,
  type RegisterAccountInput,
  type ResetPasswordInput,
} from "./authTypes";

/**
 * Map HTTP status codes and API error codes to typed AuthErrorResponse
 * This provides consistent error handling across all auth thunks
 */
function rejectFromError(error: unknown): AuthRejectValue {
  if (!isAxiosError(error)) {
    return {
      code: AUTH_ERROR_CODES.UNKNOWN,
      message: "Unknown error occurred",
      statusCode: undefined,
    };
  }

  const status = error.response?.status;
  const apiCode = error.response?.data?.code;
  const apiMessage = error.response?.data?.message;

  // Handle known HTTP status codes
  if (status === 401 || status === 403) {
    if (apiCode === "ACCOUNT_INACTIVE") {
      return {
        code: AUTH_ERROR_CODES.ACCOUNT_INACTIVE,
        message: apiMessage || "Account is inactive",
        statusCode: status,
      };
    }
    if (apiCode === "EMAIL_NOT_VERIFIED") {
      return {
        code: AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED,
        message: apiMessage || "Email not verified",
        statusCode: status,
      };
    }
    return {
      code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      message: apiMessage || "Invalid credentials",
      statusCode: status,
    };
  }

  if (status === 409) {
    return {
      code: AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS,
      message: apiMessage || "Email already exists",
      statusCode: status,
    };
  }

  if (status === 400) {
    return {
      code: AUTH_ERROR_CODES.WEAK_PASSWORD,
      message: apiMessage || "Invalid input data",
      statusCode: status,
    };
  }

  if (status && status >= 500) {
    return {
      code: AUTH_ERROR_CODES.SERVER_ERROR,
      message: apiMessage || "Server error",
      statusCode: status,
    };
  }

  if (error.code === "ERR_NETWORK" || !status) {
    return {
      code: AUTH_ERROR_CODES.NETWORK_ERROR,
      message: "Network error. Please check your connection.",
      statusCode: undefined,
    };
  }

  return {
    code: AUTH_ERROR_CODES.UNKNOWN,
    message: apiMessage || error.message || "Unknown error occurred",
    statusCode: status,
  };
}

/**
 * Bootstrap authentication — "probe" ว่ามี valid session (cookie) อยู่ไหม
 *
 * เรียก **ครั้งเดียว** ตอน app boot (ใน main.tsx) แล้วเก็บผลไว้ใน Redux
 * - success (user object)  → มี session valid, render app ได้
 * - success (null)         → ยังไม่ได้ login หรือ session หมดอายุ — ไม่ใช่ error
 * - rejected               → network/server error จริง ๆ เท่านั้น
 *
 * ใช้ silent401: true เพื่อไม่ให้ axios interceptor redirect/log 401
 * (เพราะเป็น expected outcome ไม่ใช่ bug)
 */
export const bootstrapAuth = createAsyncThunk<
  AuthUser | null,
  void,
  { rejectValue: AuthRejectValue }
>("auth/bootstrap", async (_, { rejectWithValue }) => {
  try {
    const user = await apiMe({ silent401: true });
    return user;
  } catch (error) {
    // 401/403 = ยังไม่ได้ login — ถือเป็น "unauthenticated", ไม่ใช่ error
    if (isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        return null;
      }
    }
    // Network/server error จริง → reject เพื่อให้ component แสดง error state
    return rejectWithValue(rejectFromError(error));
  }
});

export const loginWithCredentials = createAsyncThunk<
  AuthUser,
  LoginCredentials,
  { rejectValue: AuthRejectValue }
>("auth/loginWithCredentials", async (input, { rejectWithValue }) => {
  try {
    await apiLogin(input.email, input.password, input.remember);
    return await apiMe();
  } catch (error) {
    return rejectWithValue(rejectFromError(error));
  }
});

export const registerAccount = createAsyncThunk<
  { email: string },
  RegisterAccountInput,
  { rejectValue: AuthRejectValue }
>("auth/registerAccount", async (input, { rejectWithValue }) => {
  try {
    await apiRegister(input);
    return { email: input.email };
  } catch (error) {
    return rejectWithValue(rejectFromError(error));
  }
});

export const forgotPassword = createAsyncThunk<
  { email: string },
  ForgotPasswordInput,
  { rejectValue: AuthRejectValue }
>("auth/forgotPassword", async ({ email }, { rejectWithValue }) => {
  try {
    const result = await checkEmailExists(email);
    if (!result?.exists) {
      return rejectWithValue({
        code: AUTH_ERROR_CODES.EMAIL_NOT_FOUND,
        message: "Email not found in system",
      });
    }
    await requestPasswordReset(email);
    return { email };
  } catch (error) {
    return rejectWithValue(rejectFromError(error));
  }
});

export const resetPassword = createAsyncThunk<
  void,
  ResetPasswordInput,
  { rejectValue: AuthRejectValue }
>("auth/resetPassword", async ({ token, password }, { rejectWithValue }) => {
  if (!token) {
    return rejectWithValue({
      code: AUTH_ERROR_CODES.MISSING_RESET_TOKEN,
      message: "Reset token is missing",
    });
  }

  try {
    await apiResetPassword(token, password);
  } catch (error) {
    return rejectWithValue(rejectFromError(error));
  }
});

export const resendVerificationEmail = createAsyncThunk<
  void,
  { email: string },
  { rejectValue: AuthRejectValue }
>("auth/resendVerificationEmail", async ({ email }, { rejectWithValue }) => {
  try {
    await resendVerification(email);
  } catch (error) {
    return rejectWithValue(rejectFromError(error));
  }
});

/**
 * Logout — clears server cookie + local auth state.
 *
 * The thunk only owns the API call; per-slice cleanup is wired through
 * `logoutUser.fulfilled` in extraReducers (authSlice resets user, siteSelection
 * resets selected site, etc). Network failures are swallowed — local state is
 * cleared either way so the user can re-authenticate.
 */
export const logoutUser = createAsyncThunk<void, void>(
  "auth/logout",
  async () => {
    try {
      await apiLogout();
    } catch {
      // Best-effort: even if the cookie clear request fails, we still want to
      // drop local auth state so the UI doesn't act as if the user is signed in.
    }
  }
);
