import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import axios from 'axios'
import type { SemanticSearchResponse } from '../../src/types'
import { useSemanticSearch } from '../../src/hooks/useSemanticSearch'
import { SEMANTIC_SEARCH_DEFAULTS, API_ENDPOINTS } from '../../src/constants'

// Mock axios at module level
vi.mock('axios')
const mockedAxios = vi.mocked(axios, true)

/**
 * Factory for creating mock search responses.
 * Uses actual types for type safety.
 */
const createMockResponse = (
  overrides: Partial<SemanticSearchResponse> = {}
): SemanticSearchResponse => ({
  query: 'test',
  servers: [],
  tools: [],
  agents: [],
  total_servers: 0,
  total_tools: 0,
  total_agents: 0,
  ...overrides,
})

describe('useSemanticSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    // Setup default axios.isCancel behavior (type assertion for type predicate)
    ;(mockedAxios.isCancel as unknown) = vi.fn().mockReturnValue(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('returns null results and no loading state for empty query', () => {
      const { result } = renderHook(() => useSemanticSearch(''))

      expect(result.current.results).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.debouncedQuery).toBe('')
    })
  })

  describe('debouncing', () => {
    it('does not search when query is below minimum length', async () => {
      const { result } = renderHook(() => useSemanticSearch('a'))

      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS + 50)
      })

      expect(mockedAxios.post).not.toHaveBeenCalled()
      expect(result.current.loading).toBe(false)
    })

    it('debounces rapid query changes', async () => {
      const { result, rerender } = renderHook(
        ({ query }) => useSemanticSearch(query),
        { initialProps: { query: '' } }
      )

      // Simulate rapid typing
      rerender({ query: 'te' })
      rerender({ query: 'tes' })
      rerender({ query: 'test' })

      // Before debounce completes
      expect(result.current.debouncedQuery).toBe('')

      // After debounce
      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS)
      })

      expect(result.current.debouncedQuery).toBe('test')
    })

    it('resets debounce timer on each keystroke', async () => {
      mockedAxios.post.mockResolvedValue({ data: createMockResponse() })

      const { rerender } = renderHook(
        ({ query }) => useSemanticSearch(query),
        { initialProps: { query: 'te' } }
      )

      // Advance part way through debounce
      await act(async () => {
        vi.advanceTimersByTime(200)
      })

      // Type more - should reset timer
      rerender({ query: 'test' })

      // Original debounce time passes
      await act(async () => {
        vi.advanceTimersByTime(200)
      })

      // API should not have been called yet (timer was reset)
      expect(mockedAxios.post).not.toHaveBeenCalled()

      // Now complete the new debounce period
      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS - 200)
        // Flush promises to allow async operations to complete
        await vi.runAllTimersAsync()
      })

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
    })
  })

  describe('API calls', () => {
    it('makes API call with correct parameters after debounce', async () => {
      const mockResponse = createMockResponse({
        servers: [{
          path: '/test',
          server_name: 'test-server',
          description: 'Test',
          tags: [],
          num_tools: 5,
          is_enabled: true,
          relevance_score: 0.9,
          matching_tools: []
        }],
        total_servers: 1,
      })
      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse })

      renderHook(() => useSemanticSearch('test query'))

      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS)
        await vi.runAllTimersAsync()
      })

      expect(mockedAxios.post).toHaveBeenCalledWith(
        API_ENDPOINTS.SEMANTIC_SEARCH,
        expect.objectContaining({
          query: 'test query',
          entity_types: ['mcp_server', 'tool', 'a2a_agent'],
          max_results: SEMANTIC_SEARCH_DEFAULTS.MAX_RESULTS,
        }),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      )
    })

    it('sets loading state during API call', async () => {
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockedAxios.post.mockReturnValueOnce(pendingPromise as Promise<unknown>)

      const { result } = renderHook(() => useSemanticSearch('test'))

      // Trigger debounce
      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS)
      })

      // Should be loading while promise is pending
      expect(result.current.loading).toBe(true)

      // Resolve the promise
      await act(async () => {
        resolvePromise!({ data: createMockResponse() })
        await vi.runAllTimersAsync()
      })

      expect(result.current.loading).toBe(false)
    })

    it('updates results on successful response', async () => {
      const mockResponse = createMockResponse({
        query: 'test',
        total_servers: 2,
        servers: [
          {
            path: '/a',
            server_name: 'a',
            tags: [],
            num_tools: 0,
            is_enabled: true,
            relevance_score: 0.9,
            matching_tools: []
          },
          {
            path: '/b',
            server_name: 'b',
            tags: [],
            num_tools: 0,
            is_enabled: true,
            relevance_score: 0.8,
            matching_tools: []
          },
        ],
      })
      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse })

      const { result } = renderHook(() => useSemanticSearch('test'))

      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS)
        await vi.runAllTimersAsync()
      })

      expect(result.current.results).not.toBeNull()
      expect(result.current.results?.total_servers).toBe(2)
    })
  })

  describe('error handling', () => {
    it('handles network errors gracefully', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useSemanticSearch('test'))

      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS)
        await vi.runAllTimersAsync()
      })

      expect(result.current.error).toBe('Network error')
      expect(result.current.results).toBeNull()
      expect(result.current.loading).toBe(false)
    })

    it('ignores cancelled requests', async () => {
      ;(mockedAxios.isCancel as unknown) = vi.fn().mockReturnValue(true)
      mockedAxios.post.mockRejectedValueOnce(new Error('Cancelled'))

      const { result } = renderHook(() => useSemanticSearch('test'))

      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS)
        await vi.runAllTimersAsync()
      })

      // Error should not be set for cancelled requests
      expect(result.current.error).toBeNull()
    })
  })

  describe('options', () => {
    it('respects enabled=false option', async () => {
      const { result } = renderHook(() =>
        useSemanticSearch('test', { enabled: false })
      )

      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS + 50)
        await vi.runAllTimersAsync()
      })

      expect(mockedAxios.post).not.toHaveBeenCalled()
      expect(result.current.results).toBeNull()
    })

    it('uses custom maxResults when provided', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: createMockResponse() })

      renderHook(() => useSemanticSearch('test', { maxResults: 5 }))

      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS)
        await vi.runAllTimersAsync()
      })

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ max_results: 5 }),
        expect.any(Object)
      )
    })

    it('uses custom minLength when provided', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: createMockResponse() })

      // With minLength=5, "test" (4 chars) should not trigger search
      const { result } = renderHook(() =>
        useSemanticSearch('test', { minLength: 5 })
      )

      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS)
        await vi.runAllTimersAsync()
      })

      expect(mockedAxios.post).not.toHaveBeenCalled()
      expect(result.current.results).toBeNull()
    })

    it('filters by custom entityTypes when provided', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: createMockResponse() })

      renderHook(() =>
        useSemanticSearch('test', { entityTypes: ['mcp_server'] })
      )

      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS)
        await vi.runAllTimersAsync()
      })

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ entity_types: ['mcp_server'] }),
        expect.any(Object)
      )
    })
  })

  describe('cleanup', () => {
    it('cancels in-flight request on query change', async () => {
      // First request - slow
      let firstResolve: (value: unknown) => void
      mockedAxios.post.mockImplementationOnce(
        () => new Promise((resolve) => { firstResolve = resolve })
      )

      const { rerender } = renderHook(
        ({ query }) => useSemanticSearch(query),
        { initialProps: { query: 'first' } }
      )

      // Start first request
      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS)
      })

      // Change query before first completes
      mockedAxios.post.mockResolvedValueOnce({
        data: createMockResponse({ query: 'second' }),
      })
      rerender({ query: 'second' })

      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS)
        await vi.runAllTimersAsync()
      })

      // Complete first request late
      ;(mockedAxios.isCancel as unknown) = vi.fn().mockReturnValue(false)
      await act(async () => {
        firstResolve!({ data: createMockResponse({ query: 'first' }) })
      })

      // Second request should have been made
      expect(mockedAxios.post).toHaveBeenCalledTimes(2)
    })

    it('clears results when query becomes too short', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: createMockResponse({ total_servers: 1 })
      })

      const { result, rerender } = renderHook(
        ({ query }) => useSemanticSearch(query),
        { initialProps: { query: 'test' } }
      )

      // Wait for search to complete
      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS)
        await vi.runAllTimersAsync()
      })

      expect(result.current.results).not.toBeNull()

      // Now make query too short
      rerender({ query: 'a' })

      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS)
        await vi.runAllTimersAsync()
      })

      expect(result.current.results).toBeNull()
    })
  })
})
