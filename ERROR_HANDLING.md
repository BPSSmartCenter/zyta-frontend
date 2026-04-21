# Auth Error Handling Guide

## Overview
The improved error typing system provides:
- **Structured Error Codes**: Defined error codes with TypeScript enum-like pattern
- **Error Categorization**: Errors categorized into logical groups (account_issue, credentials_issue, etc.)
- **Localized Messages**: Integrated with i18n for multi-language support
- **Actionable Errors**: Helper methods to determine user action suggestions

## Key Types

### `AuthErrorResponse`
```typescript
type AuthErrorResponse = {
  code: AuthErrorCode;           // Specific error identifier
  message?: string;              // Optional backend message
  statusCode?: number;           // HTTP status code
  details?: Record<string, unknown>; // Additional error context
};
```

### `ErrorCategory`
Errors are categorized into 5 types for logical grouping:
- `credentials_issue` - User needs to retry or reset password
- `account_issue` - User account problem (inactive, not verified)
- `validation_issue` - Input validation failed
- `network_issue` - Connection/network error
- `server_issue` - Server-side error

### `AUTH_ERROR_CODES`
Object with all available error codes:
```typescript
AUTH_ERROR_CODES.ACCOUNT_INACTIVE       // Account is inactive
AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED     // Email not verified
AUTH_ERROR_CODES.INVALID_CREDENTIALS    // Wrong email/password
AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS   // Email already registered
AUTH_ERROR_CODES.WEAK_PASSWORD          // Password too weak
AUTH_ERROR_CODES.NETWORK_ERROR          // Network failure
AUTH_ERROR_CODES.SERVER_ERROR           // Server error (5xx)
// ... and more
```

## Usage Examples

### In Components

```typescript
import { useTranslation } from "react-i18next";
import { analyzeAuthError } from "../features/auth";
import type { AuthErrorResponse } from "../features/auth";

export function MyLoginPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const loginState = useAppSelector(selectLoginState);

  // When you get an error from Redux
  if (loginState.issue && loginState.lastError) {
    const { message, category, shouldRetry } = analyzeAuthError(
      loginState.lastError,
      t
    );
    
    console.log(`Category: ${category}`);        // "account_issue"
    console.log(`Message: ${message}`);          // Localized message
    console.log(`Retry? ${shouldRetry}`);        // true/false
  }

  return (
    // Your component JSX
  );
}
```

### Using AuthErrorHandler Class

```typescript
import { createAuthErrorHandler, AUTH_ERROR_CODES } from "../features/auth";
import { useTranslation } from "react-i18next";

export function ErrorDisplay() {
  const { t } = useTranslation();
  const handler = createAuthErrorHandler(t);

  const error = {
    code: AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED,
    message: "User email is not verified",
  };

  const message = handler.getErrorMessage(error);           // Localized message
  const action = handler.getSuggestedAction(error);         // "verify_email"
  const isRetryable = handler.isRetryable(error);           // false
  const requiresAction = handler.requiresUserAction(error); // true

  return (
    <div>
      <p>{message}</p>
      {action === "verify_email" && <VerifyEmailButton />}
      {isRetryable && <RetryButton />}
    </div>
  );
}
```

### Categorizing Errors

```typescript
import { categorizeAuthError, AUTH_ERROR_CODES } from "../features/auth";

const error = {
  code: AUTH_ERROR_CODES.NETWORK_ERROR,
};

const category = categorizeAuthError(error); // "network_issue"

// Use category for conditional logic
if (category === "network_issue") {
  showRetryButton();
} else if (category === "account_issue") {
  redirectToSupport();
}
```

## Adding New Error Codes

1. **Add to `AUTH_ERROR_CODES`** in `authTypes.ts`:
```typescript
export const AUTH_ERROR_CODES = {
  // ... existing codes
  NEW_ERROR: "NEW_ERROR",
} as const;
```

2. **Update `AuthErrorCode` type**:
```typescript
export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];
// Auto-updates with new code
```

3. **Add to `categorizeAuthError()`**:
```typescript
export function categorizeAuthError(error: AuthErrorResponse): ErrorCategory {
  switch (error.code) {
    // ... existing cases
    case "NEW_ERROR":
      return "appropriate_category";
    // ...
  }
}
```

4. **Add to `AuthErrorHandler.getErrorMessage()`**:
```typescript
case AUTH_ERROR_CODES.NEW_ERROR:
  return this.t("path.to.new.error", {
    defaultValue: "Default message",
  });
```

## Suggested Next Steps

1. **Add error details to Redux state**:
   - Store full error object instead of just error code
   - Allow display of additional error context

2. **Implement retry logic**:
   - Provide retry utilities for network/server errors
   - Add exponential backoff

3. **Error tracking/analytics**:
   - Send categorized errors to analytics service
   - Track error patterns

4. **Improve auth form feedback**:
   - Use categorization to show contextual help
   - Suggest actions based on error category

5. **Add error recovery**:
   - Auto-refresh token on expiry
   - Handle graceful degradation

## Testing Error Handling

```typescript
import { render, screen } from "@testing-library/react";
import { auth ErrorHandler } from "../features/auth";

describe("Error Handling", () => {
  it("should categorize network errors", () => {
    const error = {
      code: AUTH_ERROR_CODES.NETWORK_ERROR,
    };
    expect(categorizeAuthError(error)).toBe("network_issue");
  });

  it("should provide localized messages", () => {
    const handler = createAuthErrorHandler(mockT);
    const message = handler.getErrorMessage({
      code: AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED,
    });
    expect(message).toBe(mockT("common.errors.email_not_verified"));
  });
});
```
