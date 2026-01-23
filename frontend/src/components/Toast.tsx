import { CheckCircleIcon, ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type React from 'react';
import { useCallback, useEffect } from 'react';
import { TOAST_DURATION_MS } from '../constants';
import type { ToastType } from '../types';

export interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

/**
 * Toast notification component for displaying success/error messages.
 *
 * Features:
 * - Auto-dismisses after specified duration
 * - Manual close button
 * - Success (green) and error (red) variants
 * - Dark mode support
 * - Animated entrance
 */
const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = TOAST_DURATION_MS }) => {
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(handleClose, duration);
    return () => clearTimeout(timer);
  }, [handleClose, duration]);

  const Icon = type === 'success' ? CheckCircleIcon : ExclamationCircleIcon;

  const colorClasses =
    type === 'success'
      ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/50 dark:border-green-700 dark:text-green-200'
      : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/50 dark:border-red-700 dark:text-red-200';

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-top">
      <div
        className={`flex items-center p-4 rounded-lg shadow-lg border ${colorClasses}`}
        role="alert"
        aria-live="polite"
      >
        <Icon className="h-5 w-5 mr-3 shrink-0" aria-hidden="true" />
        <p className="text-sm font-medium">{message}</p>
        <button
          type="button"
          onClick={handleClose}
          className="ml-3 shrink-0 text-current opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Close notification"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

Toast.displayName = 'Toast';

export default Toast;
