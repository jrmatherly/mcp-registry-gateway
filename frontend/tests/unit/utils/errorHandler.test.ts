import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  getErrorMessage,
  handleApiError,
  isAxiosError,
} from '../../../src/utils/errorHandler'

describe('errorHandler', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getErrorMessage', () => {
    it('returns fallback message for null error', () => {
      expect(getErrorMessage(null)).toBe('An error occurred')
    })

    it('returns fallback message for undefined error', () => {
      expect(getErrorMessage(undefined)).toBe('An error occurred')
    })

    it('returns custom fallback message when provided', () => {
      expect(getErrorMessage(null, 'Custom error')).toBe('Custom error')
    })

    it('extracts detail from axios error response', () => {
      const axiosError = {
        response: {
          data: {
            detail: 'Validation failed',
          },
          status: 422,
        },
      }
      expect(getErrorMessage(axiosError)).toBe('Validation failed')
    })

    it('extracts message from axios error response when detail is absent', () => {
      const axiosError = {
        response: {
          data: {
            message: 'Server error',
          },
          status: 500,
        },
      }
      expect(getErrorMessage(axiosError)).toBe('Server error')
    })

    it('extracts message from error object when response is absent', () => {
      const error = {
        message: 'Network Error',
      }
      expect(getErrorMessage(error)).toBe('Network Error')
    })

    it('prefers response.data.detail over response.data.message', () => {
      const axiosError = {
        response: {
          data: {
            detail: 'Specific detail',
            message: 'Generic message',
          },
        },
      }
      expect(getErrorMessage(axiosError)).toBe('Specific detail')
    })

    it('returns fallback for primitive error values', () => {
      expect(getErrorMessage('string error')).toBe('An error occurred')
      expect(getErrorMessage(123)).toBe('An error occurred')
    })
  })

  describe('handleApiError', () => {
    it('logs error in development mode', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Note: import.meta.env.DEV is true in test environment by default
      handleApiError(new Error('test'), 'fetch data')

      expect(consoleSpy).toHaveBeenCalled()
    })

    it('shows toast when callback provided', () => {
      // Suppress console.error
      vi.spyOn(console, 'error').mockImplementation(() => {})

      const showToast = vi.fn()
      handleApiError(new Error('test'), 'fetch data', showToast)

      expect(showToast).toHaveBeenCalledWith('test', 'error')
    })

    it('does not show toast when callback not provided', () => {
      // Suppress console.error
      vi.spyOn(console, 'error').mockImplementation(() => {})

      // Should not throw
      expect(() => handleApiError(new Error('test'), 'fetch data')).not.toThrow()
    })

    it('silently ignores 404 when silentOn404 is true', () => {
      // Suppress console.error
      vi.spyOn(console, 'error').mockImplementation(() => {})

      const showToast = vi.fn()
      const error404 = {
        response: { status: 404 },
      }

      handleApiError(error404, 'fetch data', showToast, { silentOn404: true })

      expect(showToast).not.toHaveBeenCalled()
    })

    it('shows toast for 404 when silentOn404 is false', () => {
      // Suppress console.error
      vi.spyOn(console, 'error').mockImplementation(() => {})

      const showToast = vi.fn()
      const error404 = {
        response: { status: 404 },
      }

      handleApiError(error404, 'fetch data', showToast, { silentOn404: false })

      expect(showToast).toHaveBeenCalled()
    })

    it('respects logError option when false', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      handleApiError(new Error('test'), 'operation', undefined, { logError: false })

      // Should not log when logError is false
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('uses context in fallback error message for toast', () => {
      // Suppress console.error
      vi.spyOn(console, 'error').mockImplementation(() => {})

      const showToast = vi.fn()
      // Error without message property
      handleApiError({}, 'fetch data', showToast)

      expect(showToast).toHaveBeenCalledWith('Failed to fetch data', 'error')
    })
  })

  describe('isAxiosError', () => {
    it('returns true for valid axios error', () => {
      const axiosError = {
        response: {
          status: 404,
          data: { detail: 'Not found' },
        },
        message: 'Request failed',
      }

      expect(isAxiosError(axiosError)).toBe(true)
    })

    it('returns false for null', () => {
      expect(isAxiosError(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isAxiosError(undefined)).toBe(false)
    })

    it('returns false for plain Error object', () => {
      expect(isAxiosError(new Error('test'))).toBe(false)
    })

    it('returns false for object without response', () => {
      expect(isAxiosError({ message: 'error' })).toBe(false)
    })

    it('returns false for object with non-object response', () => {
      expect(isAxiosError({ response: 'string' })).toBe(false)
    })

    it('returns true for error with minimal response object', () => {
      const minimalAxiosError = {
        response: {},
      }
      expect(isAxiosError(minimalAxiosError)).toBe(true)
    })
  })
})
