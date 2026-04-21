import { createAsyncThunk } from "@reduxjs/toolkit";
import { isAxiosError } from "axios";
import {
  checkEmailExists,
  login as apiLogin,
  register as apiRegister,
  requestPasswordReset,
  resendVerification,
  resetPassword as apiResetPassword,
} from "../../api/auth";
import { me as apiMe } from "../../api/user";
import type {
  AuthRejectValue,
  AuthUser,
  ForgotPasswordInput,
  LoginCredentials,
  RegisterAccountInput,
  ResetPasswordInput,
} from "./authTypes";

function rejectFromError(error: unknown): AuthRejectValue {
  if (!isAxiosError(error)) {
    return { code: "UNKNOWN" };
  }

  const status = error.response?.status;
  const code = error.response?.data?.code;

  if (status === 403 && code === "ACCOUNT_INACTIVE") {
    return { code: "ACCOUNT_INACTIVE" };
  }
  if (status === 403 && code === "EMAIL_NOT_VERIFIED") {
    return { code: "EMAIL_NOT_VERIFIED" };
  }
  if (status === 409) {
    return { code: "EMAIL_ALREADY_EXISTS" };
  }

  return { code: "UNKNOWN", message: error.message };
}

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
      return rejectWithValue({ code: "EMAIL_NOT_FOUND" });
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
    return rejectWithValue({ code: "MISSING_RESET_TOKEN" });
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
