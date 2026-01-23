/**
 * Centralized error handling utilities for API calls.
 */

/**
 * Extracts a user-friendly error message from an API error response.
 *
 * @param error - The error object from an API call
 * @param fallbackMessage - Default message if none can be extracted
 * @returns User-friendly error message
 */
export const getErrorMessage = (
  error: unknown,
  fallbackMessage: string = 'An error occurred'
): string => {
  if (error && typeof error === 'object') {
    const axiosError = error as {
      response?: {
        data?: {
          detail?: string;
          message?: string;
        };
        status?: number;
      };
      message?: string;
    };

    // Try to get detail from response
    if (axiosError.response?.data?.detail) {
      return axiosError.response.data.detail;
    }

    // Try to get message from response
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }

    // Try to get message from error object
    if (axiosError.message) {
      return axiosError.message;
    }
  }

  return fallbackMessage;
};

/**
 * Handles API errors with logging and optional toast notification.
 *
 * @param error - The error object
 * @param context - Description of what operation failed
 * @param onShowToast - Optional toast notification callback
 * @param options - Additional options
 */
export const handleApiError = (
  error: unknown,
  context: string,
  onShowToast?: (message: string, type: 'success' | 'error') => void,
  options?: {
    silentOn404?: boolean;
    logError?: boolean;
  }
): void => {
  const { silentOn404 = false, logError = true } = options || {};

  // Check if this is a 404 that should be silent
  if (silentOn404) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      return;
    }
  }

  // Log error in development
  if (logError && import.meta.env.DEV) {
    console.error(`API Error (${context}):`, error);
  }

  // Show toast if callback provided
  if (onShowToast) {
    const message = getErrorMessage(error, `Failed to ${context}`);
    onShowToast(message, 'error');
  }
};

/**
 * Type guard to check if an error is an Axios error with a response.
 */
export const isAxiosError = (
  error: unknown
): error is {
  response: {
    status: number;
    data: unknown;
  };
  message: string;
} => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object'
  );
};
