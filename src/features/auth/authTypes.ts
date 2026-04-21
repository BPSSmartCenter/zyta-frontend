import type { MeResponse } from "../../api/user";

export type RequestStatus = "idle" | "pending" | "succeeded" | "failed";

export type LoginIssue = "generic" | "notVerified" | "inactive";

export type AuthUser = MeResponse;

export type LoginCredentials = {
  email: string;
  password: string;
  remember?: boolean;
};

export type RegisterAccountInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

export type ForgotPasswordInput = {
  email: string;
};

export type ResetPasswordInput = {
  token: string;
  password: string;
};

export type AuthRejectValue = {
  code:
    | "ACCOUNT_INACTIVE"
    | "EMAIL_NOT_VERIFIED"
    | "EMAIL_ALREADY_EXISTS"
    | "EMAIL_NOT_FOUND"
    | "MISSING_RESET_TOKEN"
    | "UNKNOWN";
  message?: string;
};
