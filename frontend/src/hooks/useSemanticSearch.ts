import { useEffect, useState } from 'react';
import axios from 'axios';
import type {
  SemanticSearchResponse,
  SemanticServerHit,
  SemanticToolHit,
  SemanticAgentHit,
} from '../types';
import { API_ENDPOINTS, SEMANTIC_SEARCH_DEFAULTS, DEFAULT_ENTITY_TYPES } from '../constants';
import { getErrorMessage } from '../utils/errorHandler';

// Re-export types for consumers
export type { SemanticSearchResponse, SemanticServerHit, SemanticToolHit, SemanticAgentHit };

type SearchEntityType = (typeof DEFAULT_ENTITY_TYPES)[number];

interface UseSemanticSearchOptions {
  enabled?: boolean;
  minLength?: number;
  maxResults?: number;
  entityTypes?: SearchEntityType[];
}

interface UseSemanticSearchReturn {
  results: SemanticSearchResponse | null;
  loading: boolean;
  error: string | null;
  debouncedQuery: string;
}

/**
 * Hook for performing semantic search across servers, tools, and agents.
 *
 * @param query - The search query string
 * @param options - Configuration options for the search
 * @returns Search results, loading state, error state, and debounced query
 */
export const useSemanticSearch = (
  query: string,
  options: UseSemanticSearchOptions = {}
): UseSemanticSearchReturn => {
  const [results, setResults] = useState<SemanticSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const enabled = options.enabled ?? true;
  const minLength = options.minLength ?? SEMANTIC_SEARCH_DEFAULTS.MIN_LENGTH;
  const maxResults = options.maxResults ?? SEMANTIC_SEARCH_DEFAULTS.MAX_RESULTS;
  const entityTypes = options.entityTypes ?? [...DEFAULT_ENTITY_TYPES];

  // Create stable key for entityTypes comparison
  const entityTypesKey = entityTypes.join('|');

  // Debounce user input to minimize API calls
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!enabled || debouncedQuery.length < minLength) {
      setResults(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const runSearch = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.post<SemanticSearchResponse>(
          API_ENDPOINTS.SEMANTIC_SEARCH,
          {
            query: debouncedQuery,
            entity_types: entityTypes,
            max_results: maxResults,
          },
          { signal: controller.signal }
        );
        if (!cancelled) {
          setResults(response.data);
        }
      } catch (err: unknown) {
        if (axios.isCancel(err) || cancelled) return;
        const message = getErrorMessage(err, 'Semantic search failed.');
        setError(message);
        setResults(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    runSearch();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // entityTypesKey is a serialized representation of entityTypes for stable comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, enabled, minLength, maxResults, entityTypesKey]);

  return { results, loading, error, debouncedQuery };
};
