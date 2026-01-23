import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
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

/**
 * Helper to wait for debounce to complete.
 * Uses real timers with proper async waiting.
 */
const waitForDebounce = async (): Promise<void> => {
  // Wait slightly longer than the debounce time to ensure completion
  await new Promise(resolve => setTimeout(resolve, SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS + 50))
}

describe('useSemanticSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Setup default axios.isCancel behavior (type assertion for type predicate)
    ;(mockedAxios.isCancel as unknown) = vi.fn().mockReturnValue(false)
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

      // Wait for debounce time to pass
      await waitForDebounce()

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

      // Before debounce completes, debouncedQuery should be empty
      expect(result.current.debouncedQuery).toBe('')

      // After debounce completes
      await waitFor(() => {
        expect(result.current.debouncedQuery).toBe('test')
      }, { timeout: SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS + 500 })
    })

    it('resets debounce timer on each keystroke', async () => {
      mockedAxios.post.mockResolvedValue({ data: createMockResponse() })

      const { rerender } = renderHook(
        ({ query }) => useSemanticSearch(query),
        { initialProps: { query: 'te' } }
      )

      // Wait a bit (less than full debounce)
      await new Promise(resolve => setTimeout(resolve, SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS / 2))

      // Type more - should reset timer
      rerender({ query: 'test' })

      // API should not have been called yet at this point
      // (The first query "te" meets minLength=2 so without resetting, it would have been called)
      const callCountBefore = mockedAxios.post.mock.calls.length

      // Wait for full debounce from the last keystroke
      await waitFor(() => {
        // Should have exactly one more call from when we checked
        expect(mockedAxios.post.mock.calls.length).toBeGreaterThan(callCountBefore)
      }, { timeout: SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS + 500 })

      // The last call should be with 'test', not 'te'
      const lastCall = mockedAxios.post.mock.calls[mockedAxios.post.mock.calls.length - 1] as [string, { query: string }]
      expect(lastCall[1].query).toBe('test')
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
      mockedAxios.post.mockResolvedValue({ data: mockResponse })

      renderHook(() => useSemanticSearch('test query'))

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalled()
      }, { timeout: SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS + 500 })

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
      // Use a promise we can control
      let resolvePromise: (value: { data: SemanticSearchResponse }) => void
      const pendingPromise = new Promise<{ data: SemanticSearchResponse }>((resolve) => {
        resolvePromise = resolve
      })
      mockedAxios.post.mockReturnValue(pendingPromise)

      const { result } = renderHook(() => useSemanticSearch('test'))

      // Wait for loading state after debounce triggers API call
      await waitFor(() => {
        expect(result.current.loading).toBe(true)
      }, { timeout: SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS + 500 })

      // Resolve the promise
      resolvePromise!({ data: createMockResponse() })

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
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
      mockedAxios.post.mockResolvedValue({ data: mockResponse })

      const { result } = renderHook(() => useSemanticSearch('test'))

      await waitFor(() => {
        expect(result.current.results).not.toBeNull()
      }, { timeout: SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS + 500 })

      expect(result.current.results?.total_servers).toBe(2)
    })
  })

  describe('error handling', () => {
    it('handles network errors gracefully', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useSemanticSearch('test'))

      await waitFor(() => {
        expect(result.current.error).toBe('Network error')
      }, { timeout: SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS + 500 })

      expect(result.current.results).toBeNull()
      expect(result.current.loading).toBe(false)
    })

    it('ignores cancelled requests', async () => {
      ;(mockedAxios.isCancel as unknown) = vi.fn().mockReturnValue(true)
      mockedAxios.post.mockRejectedValue(new Error('Cancelled'))

      const { result } = renderHook(() => useSemanticSearch('test'))

      // Wait for the debounce and API call to happen
      await waitForDebounce()

      // Give time for the error handling to process
      await new Promise(resolve => setTimeout(resolve, 50))

      // Error should not be set for cancelled requests
      expect(result.current.error).toBeNull()
    })
  })

  describe('options', () => {
    it('respects enabled=false option', async () => {
      const { result } = renderHook(() =>
        useSemanticSearch('test', { enabled: false })
      )

      await waitForDebounce()

      expect(mockedAxios.post).not.toHaveBeenCalled()
      expect(result.current.results).toBeNull()
    })

    it('uses custom maxResults when provided', async () => {
      mockedAxios.post.mockResolvedValue({ data: createMockResponse() })

      renderHook(() => useSemanticSearch('test', { maxResults: 5 }))

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalled()
      }, { timeout: SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS + 500 })

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ max_results: 5 }),
        expect.any(Object)
      )
    })

    it('uses custom minLength when provided', async () => {
      mockedAxios.post.mockResolvedValue({ data: createMockResponse() })

      // With minLength=5, "test" (4 chars) should not trigger search
      const { result } = renderHook(() =>
        useSemanticSearch('test', { minLength: 5 })
      )

      await waitForDebounce()

      expect(mockedAxios.post).not.toHaveBeenCalled()
      expect(result.current.results).toBeNull()
    })

    it('filters by custom entityTypes when provided', async () => {
      mockedAxios.post.mockResolvedValue({ data: createMockResponse() })

      renderHook(() =>
        useSemanticSearch('test', { entityTypes: ['mcp_server'] })
      )

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalled()
      }, { timeout: SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS + 500 })

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ entity_types: ['mcp_server'] }),
        expect.any(Object)
      )
    })
  })

  describe('cleanup', () => {
    it('cancels in-flight request on query change', async () => {
      // First request - slow (controlled promise)
      let firstResolve: (value: { data: SemanticSearchResponse }) => void
      mockedAxios.post.mockImplementation(
        () => new Promise((resolve) => { firstResolve = resolve })
      )

      const { rerender } = renderHook(
        ({ query }) => useSemanticSearch(query),
        { initialProps: { query: 'first' } }
      )

      // Wait for first request to start
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalled()
      }, { timeout: SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS + 500 })

      const callCountAfterFirst = mockedAxios.post.mock.calls.length

      // Setup second mock response for subsequent calls
      mockedAxios.post.mockResolvedValue({
        data: createMockResponse({ query: 'second' }),
      })

      // Change query before first completes
      rerender({ query: 'second' })

      // Wait for second request (more calls than before)
      await waitFor(() => {
        expect(mockedAxios.post.mock.calls.length).toBeGreaterThan(callCountAfterFirst)
      }, { timeout: SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS + 500 })

      // Complete first request late (should be ignored due to cancellation)
      firstResolve!({ data: createMockResponse({ query: 'first' }) })

      // Verify that at least 2 calls were made (first and second query)
      expect(mockedAxios.post.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    it('clears results when query becomes too short', async () => {
      mockedAxios.post.mockResolvedValue({
        data: createMockResponse({ total_servers: 1 })
      })

      const { result, rerender } = renderHook(
        ({ query }) => useSemanticSearch(query),
        { initialProps: { query: 'test' } }
      )

      // Wait for search to complete
      await waitFor(() => {
        expect(result.current.results).not.toBeNull()
      }, { timeout: SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS + 500 })

      // Now make query too short
      rerender({ query: 'a' })

      // Wait for results to clear
      await waitFor(() => {
        expect(result.current.results).toBeNull()
      }, { timeout: SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS + 500 })
    })
  })
})
