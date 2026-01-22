/**
 * Centralized axios mock utilities for consistent test setup.
 */
import { vi } from 'vitest'
import axios from 'axios'

// Create typed mock
vi.mock('axios')
export const mockedAxios = vi.mocked(axios, true)

/**
 * Reset all axios mocks to initial state.
 * Call in beforeEach for clean test isolation.
 */
export const resetAxiosMocks = (): void => {
  vi.clearAllMocks()
  // Type assertion needed because isCancel is a type predicate
  ;(mockedAxios.isCancel as unknown) = vi.fn().mockReturnValue(false)
}

/**
 * Setup axios to return a successful response.
 */
export const mockAxiosSuccess = <T>(data: T, method: 'get' | 'post' | 'put' | 'delete' = 'get'): void => {
  mockedAxios[method].mockResolvedValueOnce({ data })
}

/**
 * Setup axios to return an error response.
 */
export const mockAxiosError = (
  status: number,
  detail: string,
  method: 'get' | 'post' | 'put' | 'delete' = 'get'
): void => {
  const error = {
    response: {
      status,
      data: { detail },
    },
    message: `Request failed with status ${status}`,
  }
  mockedAxios[method].mockRejectedValueOnce(error)
}

/**
 * Setup axios to simulate network error.
 */
export const mockAxiosNetworkError = (method: 'get' | 'post' | 'put' | 'delete' = 'get'): void => {
  mockedAxios[method].mockRejectedValueOnce(new Error('Network Error'))
}

/**
 * Setup axios to return a pending promise (useful for loading state tests).
 */
export const mockAxiosPending = <T>(
  method: 'get' | 'post' | 'put' | 'delete' = 'get'
): { resolve: (data: T) => void; reject: (error: Error) => void } => {
  let resolvePromise: (value: { data: T }) => void
  let rejectPromise: (error: Error) => void

  const promise = new Promise<{ data: T }>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })

  mockedAxios[method].mockReturnValueOnce(promise)

  return {
    resolve: (data: T) => resolvePromise({ data }),
    reject: (error: Error) => rejectPromise(error),
  }
}
