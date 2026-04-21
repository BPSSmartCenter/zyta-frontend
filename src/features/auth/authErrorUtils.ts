import type { TFunction } from "i18next";
import {
  AUTH_ERROR_CODES,
  categorizeAuthError,
  type AuthErrorResponse,
  type ErrorCategory,
} from "./authTypes";

/**
 * Provides localized error messages based on error code and category
 * This centralizes error message logic for consistent UX across auth flows
 */
export class AuthErrorHandler {
  t: TFunction;

  constructor(t: TFunction) {
    this.t = t;
  }

  /**
   * Get human-readable error message for display
   */
  getErrorMessage(error: AuthErrorResponse): string {
    switch (error.code) {
      // Account issues
      case AUTH_ERROR_CODES.ACCOUNT_INACTIVE:
        return this.t("common.errors.account_inactive", {
          defaultValue: "Your account is temporarily inactive",
        });

      case AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED:
        return this.t("common.errors.email_not_verified", {
          defaultValue: "Please verify your email address",
        });

      // Credentials issues
      case AUTH_ERROR_CODES.INVALID_CREDENTIALS:
        return this.t("signin.modal.top", {
          defaultValue: "Invalid email or password",
        });

      case AUTH_ERROR_CODES.INVALID_RESET_TOKEN:
      case AUTH_ERROR_CODES.TOKEN_EXPIRED:
        return this.t("reset.errors.invalid_token", {
          defaultValue: "Reset link is invalid or expired",
        });

      case AUTH_ERROR_CODES.MISSING_RESET_TOKEN:
        return this.t("reset.errors.missing_token", {
          defaultValue: "Reset link is missing",
        });

      // Validation issues
      case AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS:
        return this.t("signup.fields.email.error", {
          defaultValue: "This email is already registered",
        });

      case AUTH_ERROR_CODES.WEAK_PASSWORD:
        return this.t("common.errors.weak_password", {
          defaultValue: "Password does not meet requirements",
        });

      case AUTH_ERROR_CODES.EMAIL_NOT_FOUND:
        return this.t("forgot.errors.not_found", {
          defaultValue: "Email not found in system",
        });

      // Network/Server issues
      case AUTH_ERROR_CODES.NETWORK_ERROR:
        return this.t("common.errors.network_error", {
          defaultValue: "Network connection error. Please try again.",
        });

      case AUTH_ERROR_CODES.SERVER_ERROR:
        return this.t("common.errors.server_error", {
          defaultValue: "Server error. Please try again later.",
        });

      case AUTH_ERROR_CODES.UNKNOWN:
      default:
        return error.message || this.t("common.errors.unknown", {
          defaultValue: "An unexpected error occurred",
        });
    }
  }

  /**
   * Determine if user should retry the operation
   */
  shouldRetry(error: AuthErrorResponse): boolean {
    const category = categorizeAuthError(error);
    return category === "network_issue" || category === "server_issue";
  }

  /**
   * Get next action suggestion for user
   */
  getSuggestedAction(
    error: AuthErrorResponse
  ): "none" | "retry" | "check_email" | "verify_email" | "reset_password" {
    switch (error.code) {
      case AUTH_ERROR_CODES.ACCOUNT_INACTIVE:
        return "none"; // Contact admin

      case AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED:
        return "verify_email";

      case AUTH_ERROR_CODES.INVALID_CREDENTIALS:
        return "reset_password";

      case AUTH_ERROR_CODES.NETWORK_ERROR:
      case AUTH_ERROR_CODES.SERVER_ERROR:
        return "retry";

      case AUTH_ERROR_CODES.EMAIL_NOT_FOUND:
        return "check_email";

      default:
        return "none";
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: AuthErrorResponse): boolean {
    return this.shouldRetry(error);
  }

  /**
   * Check if error requires user action
   */
  requiresUserAction(error: AuthErrorResponse): boolean {
    const category = categorizeAuthError(error);
    return (
      category === "account_issue" ||
      category === "validation_issue" ||
      category === "credentials_issue"
    );
  }
}

/**
 * Helper to get error handler instance
 */
export function createAuthErrorHandler(t: TFunction): AuthErrorHandler {
  return new AuthErrorHandler(t);
}

/**
 * Categorize and return actionable error info
 */
export function analyzeAuthError(
  error: AuthErrorResponse,
  t: TFunction
): {
  message: string;
  category: ErrorCategory;
  shouldRetry: boolean;
  suggestedAction: "none" | "retry" | "check_email" | "verify_email" | "reset_password";
} {
  const handler = createAuthErrorHandler(t);
  return {
    message: handler.getErrorMessage(error),
    category: categorizeAuthError(error),
    shouldRetry: handler.shouldRetry(error),
    suggestedAction: handler.getSuggestedAction(error),
  };
}

