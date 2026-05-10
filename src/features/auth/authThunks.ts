import { createAsyncThunk } from "@reduxjs/toolkit";
import { ApiError, request } from "../../lib/http";
import { normalizeMeResponse } from "../users/usersTypes";
import {
  AUTH_ERROR_CODES,
  type AuthRejectValue,
  type AuthUser,
  type ForgotPasswordInput,
  type LoginCredentials,
  type RegisterAccountInput,
  type ResetPasswordInput,
} from "./authTypes";

function rejectFromError(error: unknown): AuthRejectValue {
  if (!(error instanceof ApiError)) {
    return {
      code: AUTH_ERROR_CODES.UNKNOWN,
      message: error instanceof Error ? error.message : "Unknown error occurred",
      statusCode: undefined,
    };
  }

  const status = error.status;
  const apiCode = error.code;
  const apiMessage = error.message;

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

  if (status === undefined) {
    return {
      code: AUTH_ERROR_CODES.NETWORK_ERROR,
      message: "Network error. Please check your connection.",
      statusCode: undefined,
    };
  }

  return {
    code: AUTH_ERROR_CODES.UNKNOWN,
    message: apiMessage || "Unknown error occurred",
    statusCode: status,
  };
}

async function fetchCurrentUser(opts?: { silent401?: boolean }): Promise<AuthUser> {
  const data = await request<unknown>("/users/me", {
    silent401: opts?.silent401,
  });
  return normalizeMeResponse(data);
}

/**
 * Bootstrap authentication — probes for a valid session cookie.
 * Returns null on 401/403 (= unauthenticated, not an error).
 */
export const bootstrapAuth = createAsyncThunk<
  AuthUser | null,
  void,
  { rejectValue: AuthRejectValue }
>("auth/bootstrap", async (_, { rejectWithValue }) => {
  try {
    return await fetchCurrentUser({ silent401: true });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) return null;
    }
    return rejectWithValue(rejectFromError(error));
  }
});

export const loginWithCredentials = createAsyncThunk<
  AuthUser,
  LoginCredentials,
  { rejectValue: AuthRejectValue }
>("auth/loginWithCredentials", async (input, { rejectWithValue }) => {
  try {
    await request("/auth/login", {
      method: "POST",
      json: { email: input.email, password: input.password, remember: input.remember },
      skipCsrf: true,
    });
    return await fetchCurrentUser();
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
    await request("/auth/register", {
      method: "POST",
      json: input,
      skipCsrf: true,
    });
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
    const result = await request<{ exists: boolean }>("/auth/check-email", {
      method: "POST",
      json: { email },
      skipCsrf: true,
    });
    if (!result?.exists) {
      return rejectWithValue({
        code: AUTH_ERROR_CODES.EMAIL_NOT_FOUND,
        message: "Email not found in system",
      });
    }
    await request("/auth/forgot-password", {
      method: "POST",
      json: { email },
      skipCsrf: true,
    });
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
    await request("/auth/reset-password", {
      method: "POST",
      json: { token, password },
      skipCsrf: true,
    });
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
    await request("/auth/resend-verification", {
      method: "POST",
      json: { email },
      skipCsrf: true,
    });
  } catch (error) {
    return rejectWithValue(rejectFromError(error));
  }
});

export const verifyEmail = createAsyncThunk<void, { token: string }>(
  "auth/verifyEmail",
  async ({ token }) => {
    await request("/auth/verify-email", { params: { token } });
  }
);

/**
 * Logout — clears server cookie + local auth state.
 * Each slice resets via `logoutUser.fulfilled` in its extraReducers.
 */
export const logoutUser = createAsyncThunk<void, void>(
  "auth/logout",
  async () => {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch {
      // Best-effort: even if the cookie clear request fails, drop local state
      // so the UI doesn't act as if the user is signed in.
    }
  }
);
