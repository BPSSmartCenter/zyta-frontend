import type { MeResponse } from "../../api/user";

export type RequestStatus = "idle" | "pending" | "succeeded" | "failed";

export type LoginIssue = "generic" | "notVerified" | "inactive";

export type AuthUser = MeResponse;

// ============ INPUT TYPES ============
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

// ============ ERROR CODE TYPES ============
export const AUTH_ERROR_CODES = {
  // Login errors
  ACCOUNT_INACTIVE: "ACCOUNT_INACTIVE",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  
  // Register errors
  EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS",
  WEAK_PASSWORD: "WEAK_PASSWORD",
  
  // Forgot/Reset errors
  EMAIL_NOT_FOUND: "EMAIL_NOT_FOUND",
  MISSING_RESET_TOKEN: "MISSING_RESET_TOKEN",
  INVALID_RESET_TOKEN: "INVALID_RESET_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  
  // Generic errors
  NETWORK_ERROR: "NETWORK_ERROR",
  SERVER_ERROR: "SERVER_ERROR",
  UNKNOWN: "UNKNOWN",
} as const;

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];

// ============ ERROR RESPONSE TYPES ============
export type AuthErrorResponse = {
  code: AuthErrorCode;
  message?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
};

export type AuthRejectValue = AuthErrorResponse;

// ============ ERROR CATEGORIZATION ============
export type ErrorCategory = 
  | "credentials_issue"    // User needs to re-enter credentials
  | "account_issue"        // User account problem (inactive, not verified)
  | "validation_issue"     // Input validation failed
  | "network_issue"        // Network/connection error
  | "server_issue";        // Server-side error

// Helper to categorize errors
export function categorizeAuthError(error: AuthErrorResponse): ErrorCategory {
  switch (error.code) {
    case "ACCOUNT_INACTIVE":
    case "EMAIL_NOT_VERIFIED":
      return "account_issue";
    
    case "INVALID_CREDENTIALS":
    case "INVALID_RESET_TOKEN":
    case "TOKEN_EXPIRED":
      return "credentials_issue";
    
    case "EMAIL_ALREADY_EXISTS":
    case "WEAK_PASSWORD":
    case "EMAIL_NOT_FOUND":
      return "validation_issue";
    
    case "NETWORK_ERROR":
      return "network_issue";
    
    case "SERVER_ERROR":
    case "UNKNOWN":
    default:
      return "server_issue";
  }
}
