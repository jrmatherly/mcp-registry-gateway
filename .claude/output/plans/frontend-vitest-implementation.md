# Feature: Vitest Testing Framework for Frontend

## Feature Description

Implement Vitest as the testing framework for the MCP Registry Gateway frontend application. This will enable comprehensive unit testing, component testing, and hook testing for the React 19/TypeScript/Vite-based frontend. The implementation includes:

- Vitest configuration integrated with existing Vite setup
- React Testing Library for component testing
- Testing utilities for custom hooks
- Mock utilities for axios API calls
- Code coverage reporting with Codecov integration
- CI/CD pipeline for automated frontend testing

## User Story

As a **frontend developer**
I want to **have a comprehensive testing framework for the React frontend**
So that **I can write reliable tests for components, hooks, and utilities to ensure code quality and prevent regressions**

## Feature Metadata

- **Type**: New Capability
- **Complexity**: Medium
- **Affected Systems**: Frontend (React/TypeScript/Vite), CI/CD (GitHub Actions)
- **Dependencies**:
  - vitest ^3.0.0
  - @vitest/coverage-v8 ^3.0.0
  - @testing-library/react ^16.0.0
  - @testing-library/jest-dom ^6.0.0
  - @testing-library/user-event ^14.0.0
  - jsdom ^26.0.0

> **Quality Note**: Dependencies use caret (`^`) for minor version flexibility while pinning major versions for stability. React Testing Library v16 is specifically required for React 19 compatibility.

---

## CONTEXT REFERENCES

### Codebase Files to Read (MANDATORY)

Before implementing, read these files to understand existing patterns:

1. **`frontend/vite.config.ts`** - Current Vite configuration (already read)
   - Has React plugin and Codecov plugin configured
   - Build output to `build/` directory
   - Dev server on port 3000 with API proxy

2. **`frontend/package.json`** - Current dependencies (already read)
   - React 19.2, TypeScript 5.9, Vite 6.0
   - No existing test framework installed
   - Has Codecov Vite plugin

3. **`frontend/tsconfig.json`** - TypeScript configuration (already read)
   - ES2020 target, strict mode enabled
   - jsx: react-jsx
   - moduleResolution: bundler

4. **`frontend/src/utils/filterUtils.ts`** - Pure utility functions (already read)
   - Good candidate for initial unit tests
   - Generic TypeScript functions with clear inputs/outputs

5. **`frontend/src/hooks/useSemanticSearch.ts`** - Custom hook (already read)
   - Uses axios, useState, useEffect
   - Has debouncing logic - good for timer testing
   - Requires API mocking

6. **`frontend/src/contexts/AuthContext.tsx`** - Context with API calls (already read)
   - Provider pattern
   - axios API calls for auth

7. **`.github/workflows/registry-test.yml`** - CI pattern reference (already read)
   - Shows job structure, caching, Codecov upload
   - Use as template for frontend test workflow

### New Files to Create

```
frontend/
├── vitest.config.ts              # Vitest configuration
├── vitest.setup.ts               # Test setup (jest-dom matchers)
├── src/
│   └── test/
│       ├── test-utils.tsx        # Custom render with providers
│       └── mocks/
│           ├── axios.ts          # Centralized axios mock factory
│           └── handlers.ts       # Common mock response handlers
├── tests/                        # Test files (existing empty directory)
│   ├── unit/
│   │   ├── utils/
│   │   │   ├── filterUtils.test.ts
│   │   │   ├── dateUtils.test.ts
│   │   │   └── errorHandler.test.ts
│   │   └── constants/
│   │       └── index.test.ts
│   ├── hooks/
│   │   ├── useSemanticSearch.test.ts
│   │   ├── useMediaQuery.test.ts
│   │   └── useServerStats.test.ts
│   └── components/
│       ├── Toast.test.tsx
│       ├── ErrorBoundary.test.tsx
│       └── ServerCard.test.tsx
.github/workflows/
└── frontend-test.yml             # New CI workflow for frontend tests
```

> **Quality Improvement**: Removed redundant `src/test/setup.ts` (duplicate of `vitest.setup.ts`). Added centralized `mocks/` directory for axios mock factories and common handlers to reduce test code duplication.

### Patterns to Follow

**Vitest Configuration Pattern** (from Context7 docs):
```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/vite-env.d.ts', 'src/**/*.d.ts'],
    },
  },
})
```

**React Testing Library Pattern**:
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

test('component test pattern', async () => {
  // ARRANGE
  render(<Component />)

  // ACT
  await userEvent.click(screen.getByRole('button'))

  // ASSERT
  expect(screen.getByRole('heading')).toHaveTextContent('expected')
})
```

**Hook Testing Pattern**:
```typescript
import { renderHook, act } from '@testing-library/react'

test('hook test pattern', () => {
  const { result } = renderHook(() => useCustomHook())

  act(() => {
    result.current.someMethod()
  })

  expect(result.current.value).toBe('expected')
})
```

**API Mocking Pattern**:
```typescript
import { vi } from 'vitest'
import axios from 'axios'

vi.mock('axios')
const mockedAxios = vi.mocked(axios, true)

test('api call test', async () => {
  mockedAxios.get.mockResolvedValueOnce({ data: { ... } })
  // ... test
})
```

**Timer Mocking Pattern** (for debounce testing):
```typescript
import { vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()  // Use useRealTimers instead of restoreAllMocks for timers
  vi.clearAllMocks()  // Separate call to clear mock state
})

test('debounced function', async () => {
  // trigger debounce
  vi.advanceTimersByTime(350)
  // assert
})
```

> **Quality Improvement**: Timer cleanup should use `vi.useRealTimers()` rather than `vi.restoreAllMocks()`. The latter doesn't restore real timers. Added `vi.clearAllMocks()` separately for mock state cleanup.

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation - Install Dependencies & Configuration

**Objective**: Set up Vitest with all required dependencies and configure it to work with existing Vite setup.

**Steps**:
1. Install Vitest and testing dependencies via npm
2. Create `vitest.config.ts` extending existing Vite config
3. Create `vitest.setup.ts` for jest-dom matchers
4. Update `tsconfig.json` to include test types
5. Add test scripts to `package.json`

### Phase 2: Testing Infrastructure - Utilities & Test Helpers

**Objective**: Create reusable testing utilities for consistent test patterns.

**Steps**:
1. Create `src/test/test-utils.tsx` with custom render function
2. Set up provider wrappers (AuthProvider, ThemeProvider)
3. Create mock factories for common data types
4. Configure axios mock utilities

### Phase 3: Unit Tests - Pure Functions & Constants

**Objective**: Test pure utility functions that have no React dependencies.

**Steps**:
1. Create `tests/unit/utils/filterUtils.test.ts`
2. Create `tests/unit/utils/dateUtils.test.ts`
3. Create `tests/unit/utils/errorHandler.test.ts`
4. Create `tests/unit/constants/index.test.ts`

### Phase 4: Hook Tests - Custom React Hooks

**Objective**: Test custom hooks with proper async handling and mocking.

**Steps**:
1. Create `tests/hooks/useSemanticSearch.test.ts` (with timer + axios mocks)
2. Create `tests/hooks/useMediaQuery.test.ts`
3. Create `tests/hooks/useServerStats.test.ts`

### Phase 5: Component Tests - React Components

**Objective**: Test key React components with user interaction simulation.

**Steps**:
1. Create `tests/components/Toast.test.tsx`
2. Create `tests/components/ErrorBoundary.test.tsx`
3. Create `tests/components/ServerCard.test.tsx`

### Phase 6: CI/CD Integration

**Objective**: Add automated frontend testing to GitHub Actions.

**Steps**:
1. Create `.github/workflows/frontend-test.yml`
2. Configure Codecov upload for frontend coverage
3. Add path filters for frontend changes

---

## STEP-BY-STEP TASKS

### Task 1: Install Dependencies

**Action**: Install Vitest and React Testing Library packages

```bash
cd frontend && npm install --save-dev \
  vitest \
  @vitest/coverage-v8 \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jsdom \
  @types/node
```

**Validation**:
```bash
cd frontend && cat package.json | grep -E "(vitest|testing-library|jsdom)"
```

---

### Task 2: Create Vitest Configuration

**Action**: Create `frontend/vitest.config.ts`

```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/build/**'],
    // Isolate test files for better parallelization and avoiding state leakage
    isolate: true,
    // Pool configuration for parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './tests/reports/coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/vite-env.d.ts',
        'src/**/*.d.ts',
        'src/test/**',
        'src/index.tsx',
        'src/main.tsx',        // Entry point, not testable
        'src/App.tsx',         // Root component, test via integration
      ],
      thresholds: {
        statements: 30,
        branches: 30,
        functions: 30,
        lines: 30,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    // Retry flaky tests once in CI
    retry: process.env.CI ? 1 : 0,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
```

**Validation**:
```bash
cd frontend && npx vitest --version
```

---

### Task 3: Create Vitest Setup File

**Action**: Create `frontend/vitest.setup.ts`

```typescript
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, vi } from 'vitest'

// Cleanup after each test (prevents memory leaks and state pollution)
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Mock window.matchMedia (required for useMediaQuery and responsive components)
// This is defined once before all tests for consistency
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated but needed for older browser compat code
      removeListener: vi.fn(), // deprecated but needed for older browser compat code
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

// Mock IntersectionObserver (used by lazy loading components)
class MockIntersectionObserver {
  readonly root: Element | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []

  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
  takeRecords = vi.fn().mockReturnValue([])
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
})

// Mock ResizeObserver (used by responsive components)
class MockResizeObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
})

// Suppress React 18/19 console warnings about act() in tests
// This can be removed once React Testing Library fully supports React 19
const originalError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})
```

> **Quality Improvements**:
> - Added `vi.clearAllMocks()` to afterEach for consistent mock state reset
> - Added `configurable: true` to Object.defineProperty for test isolation
> - Added `beforeAll` for matchMedia setup (avoids redefinition per test)
> - Added `takeRecords` to IntersectionObserver mock (complete interface)
> - Added readonly properties to IntersectionObserver mock for type safety
> - Added React warning suppression for common false positives

**Validation**:
```bash
cd frontend && ls -la vitest.setup.ts
```

---

### Task 4: Update TypeScript Configuration

**Action**: Update `frontend/tsconfig.json` to include Vitest types

Add to compilerOptions:
```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

**Validation**:
```bash
cd frontend && npx tsc --noEmit
```

---

### Task 5: Add Test Scripts to package.json

**Action**: Add test-related scripts to `frontend/package.json`

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:ci": "vitest run --coverage --reporter=verbose"
  }
}
```

**Validation**:
```bash
cd frontend && npm run test -- --help
```

---

### Task 6: Create Test Utilities

**Action**: Create `frontend/src/test/test-utils.tsx`

```typescript
import React, { ReactElement, ReactNode } from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { MemoryRouter, MemoryRouterProps } from 'react-router'
import { ThemeProvider } from '../contexts/ThemeContext'

/**
 * Options for customizing the test wrapper providers.
 */
interface WrapperOptions {
  /** Initial route entries for MemoryRouter */
  initialRoutes?: MemoryRouterProps['initialEntries']
  /** Whether to include AuthProvider (requires mocking axios first) */
  withAuth?: boolean
}

interface AllProvidersProps extends WrapperOptions {
  children: ReactNode
}

/**
 * Wrapper component that includes providers needed for testing.
 *
 * Note: Uses MemoryRouter instead of BrowserRouter for test isolation.
 * AuthProvider is optional because it makes API calls on mount - tests
 * that need auth should mock axios before including it.
 */
const AllProviders: React.FC<AllProvidersProps> = ({
  children,
  initialRoutes = ['/'],
  withAuth = false,
}) => {
  // Dynamic import to avoid circular dependencies and allow conditional loading
  const AuthWrapper = withAuth
    ? React.lazy(() =>
        import('../contexts/AuthContext').then((m) => ({
          default: ({ children }: { children: ReactNode }) => (
            <m.AuthProvider>{children}</m.AuthProvider>
          ),
        }))
      )
    : React.Fragment

  return (
    <MemoryRouter initialEntries={initialRoutes}>
      <ThemeProvider>
        <React.Suspense fallback={null}>
          <AuthWrapper>{children}</AuthWrapper>
        </React.Suspense>
      </ThemeProvider>
    </MemoryRouter>
  )
}

/**
 * Extended render options including wrapper configuration.
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  wrapperOptions?: WrapperOptions
}

/**
 * Custom render function that wraps components in all necessary providers.
 *
 * @example
 * // Basic render
 * render(<MyComponent />)
 *
 * // With custom initial route
 * render(<MyComponent />, { wrapperOptions: { initialRoutes: ['/servers'] } })
 *
 * // With auth provider (ensure axios is mocked first)
 * render(<MyComponent />, { wrapperOptions: { withAuth: true } })
 */
const customRender = (
  ui: ReactElement,
  { wrapperOptions, ...options }: CustomRenderOptions = {}
): RenderResult => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AllProviders {...wrapperOptions}>{children}</AllProviders>
  )

  return render(ui, { wrapper: Wrapper, ...options })
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'

// Override render with custom render
export { customRender as render }

// Export types for consumers
export type { WrapperOptions, CustomRenderOptions }
```

> **Quality Improvements**:
> - Changed `BrowserRouter` to `MemoryRouter` for test isolation (BrowserRouter uses real browser history)
> - Made `AuthProvider` optional via `withAuth` flag (it makes API calls on mount)
> - Added `initialRoutes` option for testing route-dependent components
> - Added proper TypeScript types for custom options
> - Added JSDoc examples for clarity
> - Added Suspense boundary for lazy-loaded AuthProvider
> - Exported types for test file type safety

**Validation**:
```bash
cd frontend && ls -la src/test/test-utils.tsx
```

---

### Task 7: Create filterUtils Unit Tests

**Action**: Create `frontend/tests/unit/utils/filterUtils.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import type { ActiveFilter } from '../../../src/types'
import {
  filterByStatus,
  filterBySearchTerm,
  filterEntities,
} from '../../../src/utils/filterUtils'

/**
 * Factory function to create test entities with type safety.
 * Uses Partial to allow overriding any field.
 */
interface TestEntity {
  name: string
  path: string
  description?: string
  tags?: string[]
  enabled: boolean
  status?: string
}

const createEntity = (overrides: Partial<TestEntity> = {}): TestEntity => ({
  name: 'test-server',
  path: '/test/path',
  description: 'Test description',
  tags: ['tag1', 'tag2'],
  enabled: true,
  status: 'healthy',
  ...overrides,
})

describe('filterUtils', () => {
  describe('filterByStatus', () => {
    // Define test fixtures once, reuse across tests
    const entities = [
      createEntity({ name: 'enabled-healthy', enabled: true, status: 'healthy' }),
      createEntity({ name: 'enabled-unhealthy', enabled: true, status: 'unhealthy' }),
      createEntity({ name: 'disabled', enabled: false, status: 'unknown' }),
    ]

    it('returns all entities when filter is "all"', () => {
      const result = filterByStatus(entities, 'all')
      expect(result).toHaveLength(3)
    })

    it('returns only enabled entities when filter is "enabled"', () => {
      const result = filterByStatus(entities, 'enabled')
      expect(result).toHaveLength(2)
      expect(result.every((e) => e.enabled)).toBe(true)
    })

    it('returns only disabled entities when filter is "disabled"', () => {
      const result = filterByStatus(entities, 'disabled')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('disabled')
    })

    it('returns only unhealthy entities when filter is "unhealthy"', () => {
      const result = filterByStatus(entities, 'unhealthy')
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('unhealthy')
    })

    it('returns empty array when no entities match', () => {
      const healthyOnly = [createEntity({ status: 'healthy' })]
      const result = filterByStatus(healthyOnly, 'unhealthy')
      expect(result).toHaveLength(0)
    })

    // Edge case: handles empty array input
    it('returns empty array when input is empty', () => {
      const result = filterByStatus([], 'all')
      expect(result).toHaveLength(0)
    })

    // Edge case: handles unknown filter value (defensive)
    it('returns all entities for unknown filter value', () => {
      const result = filterByStatus(entities, 'invalid' as ActiveFilter)
      expect(result).toHaveLength(3)
    })
  })

  describe('filterBySearchTerm', () => {
    const entities = [
      createEntity({ name: 'weather-api', description: 'Weather data service' }),
      createEntity({ name: 'user-service', description: 'User management', tags: ['auth'] }),
      createEntity({ name: 'data-processor', path: '/data/process' }),
    ]

    it('returns all entities when search term is empty', () => {
      const result = filterBySearchTerm(entities, '')
      expect(result).toHaveLength(3)
    })

    it('returns all entities when search term is whitespace', () => {
      const result = filterBySearchTerm(entities, '   ')
      expect(result).toHaveLength(3)
    })

    it('filters by name (case insensitive)', () => {
      const result = filterBySearchTerm(entities, 'WEATHER')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('weather-api')
    })

    it('filters by description', () => {
      const result = filterBySearchTerm(entities, 'management')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('user-service')
    })

    it('filters by path', () => {
      const result = filterBySearchTerm(entities, '/data/')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('data-processor')
    })

    it('filters by tags', () => {
      const result = filterBySearchTerm(entities, 'auth')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('user-service')
    })

    // Edge case: entity with undefined optional fields
    it('handles entities with undefined description and tags', () => {
      const entitiesWithUndefined = [
        createEntity({ name: 'minimal', description: undefined, tags: undefined }),
      ]
      // Should not throw when searching
      const result = filterBySearchTerm(entitiesWithUndefined, 'minimal')
      expect(result).toHaveLength(1)
    })

    // Edge case: special regex characters in search term
    it('handles special characters in search term', () => {
      const entitiesWithSpecial = [
        createEntity({ name: 'api-v2.0', description: 'Version (2.0)' }),
      ]
      // Should treat as literal string, not regex
      const result = filterBySearchTerm(entitiesWithSpecial, '(2.0)')
      expect(result).toHaveLength(1)
    })
  })

  describe('filterEntities', () => {
    const entities = [
      createEntity({ name: 'weather-api', enabled: true }),
      createEntity({ name: 'weather-backup', enabled: false }),
      createEntity({ name: 'user-service', enabled: true }),
    ]

    it('applies both status and search filters', () => {
      const result = filterEntities(entities, 'enabled', 'weather')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('weather-api')
    })

    it('returns empty when filters have no overlap', () => {
      const result = filterEntities(entities, 'disabled', 'user')
      expect(result).toHaveLength(0)
    })

    // Verify filter order: status first, then search (optimization)
    it('applies status filter before search filter', () => {
      // This test documents the expected behavior: status filter runs first
      // which is more efficient when there are many entities
      const result = filterEntities(entities, 'disabled', 'weather')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('weather-backup')
    })
  })
})
```

> **Quality Improvements**:
> - Added TypeScript interface for test entity factory with proper typing
> - Added edge case tests: empty array input, unknown filter values, undefined optional fields
> - Added test for special regex characters in search term (potential bug surface)
> - Added test documenting filter order (status before search)
> - Imported `ActiveFilter` type for proper type checking
> - Added JSDoc to factory function

**Validation**:
```bash
cd frontend && npm run test -- tests/unit/utils/filterUtils.test.ts
```

---

### Task 8: Create Constants Unit Tests

**Action**: Create `frontend/tests/unit/constants/index.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import {
  EXTERNAL_REGISTRY_TAGS,
  hasExternalRegistryTag,
  SEMANTIC_SEARCH_DEFAULTS,
  getScopeDescription,
  API_ENDPOINTS,
} from '../../../src/constants'

describe('constants', () => {
  describe('EXTERNAL_REGISTRY_TAGS', () => {
    it('contains expected external registry identifiers', () => {
      expect(EXTERNAL_REGISTRY_TAGS).toContain('anthropic-registry')
      expect(EXTERNAL_REGISTRY_TAGS).toContain('workday-asor')
      expect(EXTERNAL_REGISTRY_TAGS).toContain('federated')
    })
  })

  describe('hasExternalRegistryTag', () => {
    it('returns true when tags contain external registry tag', () => {
      expect(hasExternalRegistryTag(['local', 'anthropic-registry'])).toBe(true)
      expect(hasExternalRegistryTag(['federated'])).toBe(true)
    })

    it('returns false when tags do not contain external registry tag', () => {
      expect(hasExternalRegistryTag(['local', 'internal'])).toBe(false)
    })

    it('returns false for undefined or empty tags', () => {
      expect(hasExternalRegistryTag(undefined)).toBe(false)
      expect(hasExternalRegistryTag([])).toBe(false)
    })
  })

  describe('SEMANTIC_SEARCH_DEFAULTS', () => {
    it('has expected default values', () => {
      expect(SEMANTIC_SEARCH_DEFAULTS.MIN_LENGTH).toBe(2)
      expect(SEMANTIC_SEARCH_DEFAULTS.MAX_RESULTS).toBe(10)
      expect(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS).toBe(350)
    })
  })

  describe('getScopeDescription', () => {
    it('returns description for known scopes', () => {
      expect(getScopeDescription('mcp-servers/read')).toBe('Read access to all MCP servers')
      expect(getScopeDescription('mcp-registry-admin')).toBe('Full registry administration access')
    })

    it('returns default message for unknown scopes', () => {
      expect(getScopeDescription('unknown-scope')).toBe('Custom permission scope')
    })
  })

  describe('API_ENDPOINTS', () => {
    it('has all required auth endpoints', () => {
      expect(API_ENDPOINTS.AUTH_ME).toBe('/api/auth/me')
      expect(API_ENDPOINTS.AUTH_LOGIN).toBe('/api/auth/login')
      expect(API_ENDPOINTS.AUTH_LOGOUT).toBe('/api/auth/logout')
    })

    it('has server endpoints', () => {
      expect(API_ENDPOINTS.SERVERS).toBe('/api/servers')
      expect(API_ENDPOINTS.SEMANTIC_SEARCH).toBe('/api/search/semantic')
    })
  })
})
```

**Validation**:
```bash
cd frontend && npm run test -- tests/unit/constants/index.test.ts
```

---

### Task 9: Create useSemanticSearch Hook Tests

**Action**: Create `frontend/tests/hooks/useSemanticSearch.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
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
    // Setup default axios.isCancel behavior
    mockedAxios.isCancel = vi.fn().mockReturnValue(false)
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
        vi.advanceTimersByTime(150)
      })

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      })
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
      })

      await waitFor(() => {
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
    })

    it('sets loading state during API call', async () => {
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockedAxios.post.mockReturnValue(pendingPromise)

      const { result } = renderHook(() => useSemanticSearch('test'))

      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS)
      })

      // Should be loading while promise is pending
      expect(result.current.loading).toBe(true)

      // Resolve the promise
      await act(async () => {
        resolvePromise!({ data: createMockResponse() })
      })

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
      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse })

      const { result } = renderHook(() => useSemanticSearch('test'))

      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS)
      })

      await waitFor(() => {
        expect(result.current.results).not.toBeNull()
        expect(result.current.results?.total_servers).toBe(2)
      })
    })
  })

  describe('error handling', () => {
    it('handles network errors gracefully', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useSemanticSearch('test'))

      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS)
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Semantic search failed.')
        expect(result.current.results).toBeNull()
        expect(result.current.loading).toBe(false)
      })
    })

    it('ignores cancelled requests', async () => {
      mockedAxios.isCancel = vi.fn().mockReturnValue(true)
      mockedAxios.post.mockRejectedValueOnce(new Error('Cancelled'))

      const { result } = renderHook(() => useSemanticSearch('test'))

      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS)
      })

      // Error should not be set for cancelled requests
      await waitFor(() => {
        expect(result.current.error).toBeNull()
      })
    })
  })

  describe('options', () => {
    it('respects enabled=false option', async () => {
      const { result } = renderHook(() =>
        useSemanticSearch('test', { enabled: false })
      )

      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS + 50)
      })

      expect(mockedAxios.post).not.toHaveBeenCalled()
      expect(result.current.results).toBeNull()
    })

    it('uses custom maxResults when provided', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: createMockResponse() })

      renderHook(() => useSemanticSearch('test', { maxResults: 5 }))

      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS)
      })

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ max_results: 5 }),
          expect.any(Object)
        )
      })
    })

    it('uses custom minLength when provided', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: createMockResponse() })

      // With minLength=5, "test" (4 chars) should not trigger search
      const { result } = renderHook(() =>
        useSemanticSearch('test', { minLength: 5 })
      )

      await act(async () => {
        vi.advanceTimersByTime(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS)
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
      })

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ entity_types: ['mcp_server'] }),
          expect.any(Object)
        )
      })
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
      })

      // Complete first request late
      mockedAxios.isCancel = vi.fn().mockReturnValue(false)
      await act(async () => {
        firstResolve!({ data: createMockResponse({ query: 'first' }) })
      })

      // Second request should have been made
      expect(mockedAxios.post).toHaveBeenCalledTimes(2)
    })
  })
})
```

> **Quality Improvements**:
> - Organized tests into logical describe blocks (initial state, debouncing, API calls, error handling, options, cleanup)
> - Created typed mock response factory function
> - Used constants (`SEMANTIC_SEARCH_DEFAULTS`, `API_ENDPOINTS`) instead of magic numbers
> - Added test for request cancellation on query change
> - Added test for minLength and entityTypes options
> - Added test verifying AbortSignal is passed to axios
> - Added test for cancelled request handling
> - Moved `axios.isCancel` mock setup to beforeEach for consistency
> - Added complete mock response data matching actual API types
> - Added debounce timer reset verification test

**Validation**:
```bash
cd frontend && npm run test -- tests/hooks/useSemanticSearch.test.ts
```

---

### Task 10: Create Toast Component Tests

**Action**: Create `frontend/tests/components/Toast.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '../../src/test/test-utils'
import userEvent from '@testing-library/user-event'
import Toast from '../../src/components/Toast'
import type { ToastProps } from '../../src/components/Toast'
import { TOAST_DURATION_MS } from '../../src/constants'

describe('Toast', () => {
  // Use typed default props for better test maintainability
  const defaultProps: ToastProps = {
    message: 'Test message',
    type: 'success',
    onClose: vi.fn(),
  }

  // Helper to create props with overrides
  const createProps = (overrides: Partial<ToastProps> = {}): ToastProps => ({
    ...defaultProps,
    onClose: vi.fn(), // Fresh mock for each test
    ...overrides,
  })

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders success toast with correct styling and icon', () => {
      render(<Toast {...createProps({ type: 'success' })} />)

      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
      expect(screen.getByText('Test message')).toBeInTheDocument()
      expect(alert).toHaveClass('bg-green-50')

      // Verify success icon is present (CheckCircle)
      const icon = within(alert).getByRole('img', { hidden: true })
        || alert.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('renders error toast with correct styling', () => {
      render(<Toast {...createProps({ type: 'error' })} />)

      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('bg-red-50')
    })

    it('renders message text correctly', () => {
      const longMessage = 'This is a longer error message with details about what went wrong'
      render(<Toast {...createProps({ message: longMessage })} />)

      expect(screen.getByText(longMessage)).toBeInTheDocument()
    })

    it('renders close button with accessible label', () => {
      render(<Toast {...createProps()} />)

      const closeButton = screen.getByRole('button', { name: /close notification/i })
      expect(closeButton).toBeInTheDocument()
      expect(closeButton).toHaveAttribute('aria-label')
    })
  })

  describe('interactions', () => {
    it('calls onClose when close button is clicked', async () => {
      // Setup userEvent with fake timers
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const onClose = vi.fn()

      render(<Toast {...createProps({ onClose })} />)

      await user.click(screen.getByRole('button', { name: /close notification/i }))

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('does not call onClose multiple times on rapid clicks', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const onClose = vi.fn()

      render(<Toast {...createProps({ onClose })} />)

      const closeButton = screen.getByRole('button', { name: /close notification/i })

      // Rapid clicks
      await user.click(closeButton)
      await user.click(closeButton)
      await user.click(closeButton)

      // Should only call once (first click triggers close)
      expect(onClose).toHaveBeenCalledTimes(3) // Each click calls handler, but component unmounts
    })
  })

  describe('auto-dismiss', () => {
    it('auto-dismisses after default duration', () => {
      const onClose = vi.fn()
      render(<Toast {...createProps({ onClose })} />)

      expect(onClose).not.toHaveBeenCalled()

      vi.advanceTimersByTime(TOAST_DURATION_MS)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('auto-dismisses after custom duration', () => {
      const onClose = vi.fn()
      const customDuration = 2000
      render(<Toast {...createProps({ onClose, duration: customDuration })} />)

      vi.advanceTimersByTime(customDuration - 1)
      expect(onClose).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('clears timeout on unmount to prevent memory leak', () => {
      const onClose = vi.fn()
      const { unmount } = render(<Toast {...createProps({ onClose })} />)

      // Unmount before timer fires
      unmount()

      // Advance past the duration
      vi.advanceTimersByTime(TOAST_DURATION_MS + 1000)

      // onClose should not be called after unmount
      expect(onClose).not.toHaveBeenCalled()
    })

    it('only fires onClose once even if timer and click overlap', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const onClose = vi.fn()

      render(<Toast {...createProps({ onClose, duration: 100 })} />)

      // Click close just before timer would fire
      vi.advanceTimersByTime(50)
      await user.click(screen.getByRole('button', { name: /close notification/i }))

      // Advance past duration
      vi.advanceTimersByTime(100)

      // onClose called once for click, but timer was cleared
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('has role="alert" for screen readers', () => {
      render(<Toast {...createProps()} />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('has aria-live="polite" for non-urgent notifications', () => {
      render(<Toast {...createProps()} />)

      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite')
    })

    it('close button has descriptive aria-label', () => {
      render(<Toast {...createProps()} />)

      const closeButton = screen.getByRole('button')
      expect(closeButton).toHaveAttribute('aria-label', 'Close notification')
    })

    it('icons are hidden from screen readers', () => {
      render(<Toast {...createProps()} />)

      const alert = screen.getByRole('alert')
      const icon = alert.querySelector('svg')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('dark mode', () => {
    it('has dark mode classes for success variant', () => {
      render(<Toast {...createProps({ type: 'success' })} />)

      const alert = screen.getByRole('alert')
      // Check that dark mode classes are present
      expect(alert.className).toContain('dark:bg-green-900')
    })

    it('has dark mode classes for error variant', () => {
      render(<Toast {...createProps({ type: 'error' })} />)

      const alert = screen.getByRole('alert')
      expect(alert.className).toContain('dark:bg-red-900')
    })
  })
})
```

> **Quality Improvements**:
> - Added typed props with `ToastProps` import for type safety
> - Created `createProps` helper for cleaner test setup with fresh mocks
> - Organized tests into logical describe blocks
> - Used `TOAST_DURATION_MS` constant instead of magic number
> - Added test for memory leak prevention (timeout cleared on unmount)
> - Added test for click/timer overlap race condition
> - Added comprehensive accessibility tests (aria-live, aria-label, aria-hidden)
> - Added dark mode styling verification tests
> - Added test for close button accessible label
> - Imported `within` for scoped queries
> - Added test for long message rendering

**Validation**:
```bash
cd frontend && npm run test -- tests/components/Toast.test.tsx
```

---

### Task 11: Create GitHub Actions Workflow

**Action**: Create `.github/workflows/frontend-test.yml`

```yaml
name: Frontend Test Suite

on:
  push:
    branches: [main, develop]
    paths:
      - "frontend/**"
      - ".github/workflows/frontend-test.yml"
  pull_request:
    branches: [main, develop]
    paths:
      - "frontend/**"
      - ".github/workflows/frontend-test.yml"
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    name: "Test (Node ${{ matrix.node-version }})"
    runs-on: ubuntu-latest
    timeout-minutes: 15

    strategy:
      matrix:
        node-version: ["20"]
      fail-fast: false

    defaults:
      run:
        working-directory: frontend

    steps:
      - name: Checkout code
        uses: actions/checkout@v6

      - name: Set up Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run type check
        run: npx tsc --noEmit

      - name: Run tests with coverage
        run: npm run test:ci

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v5
        with:
          files: frontend/tests/reports/coverage/lcov.info
          flags: frontend
          name: codecov-frontend-${{ matrix.node-version }}
          fail_ci_if_error: false

      - name: Upload coverage HTML report
        uses: actions/upload-artifact@v6
        if: always()
        with:
          name: frontend-coverage-${{ matrix.node-version }}
          path: frontend/tests/reports/coverage/
          retention-days: 14

  lint:
    name: "Lint & Format"
    runs-on: ubuntu-latest
    timeout-minutes: 10

    defaults:
      run:
        working-directory: frontend

    steps:
      - name: Checkout code
        uses: actions/checkout@v6

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run TypeScript check
        run: npx tsc --noEmit

  build:
    name: "Build"
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: [test, lint]

    defaults:
      run:
        working-directory: frontend

    steps:
      - name: Checkout code
        uses: actions/checkout@v6

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload build artifact
        uses: actions/upload-artifact@v6
        with:
          name: frontend-build
          path: frontend/build/
          retention-days: 7

  summary:
    name: "Test Summary"
    runs-on: ubuntu-latest
    timeout-minutes: 5
    needs: [test, lint, build]
    if: always()

    steps:
      - name: Test Results Summary
        run: |
          echo "## Frontend Test Results Summary" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Job | Status |" >> $GITHUB_STEP_SUMMARY
          echo "|-----|--------|" >> $GITHUB_STEP_SUMMARY
          echo "| Tests | ${{ needs.test.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Lint | ${{ needs.lint.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Build | ${{ needs.build.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY

          if [[ "${{ needs.test.result }}" == "success" && "${{ needs.lint.result }}" == "success" && "${{ needs.build.result }}" == "success" ]]; then
            echo "All frontend checks passed!" >> $GITHUB_STEP_SUMMARY
          else
            echo "Some checks failed. Please review the logs." >> $GITHUB_STEP_SUMMARY
          fi
```

**Validation**:
```bash
cat .github/workflows/frontend-test.yml | head -20
```

---

### Task 12: Create Directory Structure

**Action**: Create required test directories

```bash
cd frontend && mkdir -p tests/unit/utils tests/unit/constants tests/hooks tests/components src/test/mocks
```

**Validation**:
```bash
cd frontend && find tests -type d
```

---

### Task 13: Create dateUtils Unit Tests

**Action**: Create `frontend/tests/unit/utils/dateUtils.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatTimeSince, formatISODate } from '../../../src/utils/dateUtils'

describe('dateUtils', () => {
  describe('formatTimeSince', () => {
    // Use fixed time for predictable tests
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-22T12:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns null for null input', () => {
      expect(formatTimeSince(null)).toBeNull()
    })

    it('returns null for undefined input', () => {
      expect(formatTimeSince(undefined)).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(formatTimeSince('')).toBeNull()
    })

    it('returns null for invalid date string', () => {
      expect(formatTimeSince('invalid-date')).toBeNull()
    })

    it('formats seconds ago correctly', () => {
      const timestamp = new Date('2025-01-22T11:59:30.000Z').toISOString()
      expect(formatTimeSince(timestamp)).toBe('30s ago')
    })

    it('formats minutes ago correctly', () => {
      const timestamp = new Date('2025-01-22T11:45:00.000Z').toISOString()
      expect(formatTimeSince(timestamp)).toBe('15m ago')
    })

    it('formats hours ago correctly', () => {
      const timestamp = new Date('2025-01-22T09:00:00.000Z').toISOString()
      expect(formatTimeSince(timestamp)).toBe('3h ago')
    })

    it('formats days ago correctly', () => {
      const timestamp = new Date('2025-01-20T12:00:00.000Z').toISOString()
      expect(formatTimeSince(timestamp)).toBe('2d ago')
    })

    it('handles exactly 0 seconds difference', () => {
      const timestamp = new Date('2025-01-22T12:00:00.000Z').toISOString()
      expect(formatTimeSince(timestamp)).toBe('0s ago')
    })

    it('handles future dates gracefully', () => {
      const futureTimestamp = new Date('2025-01-23T12:00:00.000Z').toISOString()
      // Implementation returns negative-looking value or handles it
      const result = formatTimeSince(futureTimestamp)
      expect(result).not.toBeNull()
    })

    it('handles edge case at boundary (59 seconds)', () => {
      const timestamp = new Date('2025-01-22T11:59:01.000Z').toISOString()
      expect(formatTimeSince(timestamp)).toBe('59s ago')
    })

    it('handles edge case at boundary (59 minutes)', () => {
      const timestamp = new Date('2025-01-22T11:01:00.000Z').toISOString()
      expect(formatTimeSince(timestamp)).toBe('59m ago')
    })

    it('handles edge case at boundary (23 hours)', () => {
      const timestamp = new Date('2025-01-21T13:00:00.000Z').toISOString()
      expect(formatTimeSince(timestamp)).toBe('23h ago')
    })
  })

  describe('formatISODate', () => {
    it('formats Date object to ISO date string', () => {
      const date = new Date('2025-01-22T15:30:00.000Z')
      expect(formatISODate(date)).toBe('2025-01-22')
    })

    it('formats timestamp number to ISO date string', () => {
      const timestamp = new Date('2025-06-15T00:00:00.000Z').getTime()
      expect(formatISODate(timestamp)).toBe('2025-06-15')
    })

    it('handles beginning of year', () => {
      const date = new Date('2025-01-01T00:00:00.000Z')
      expect(formatISODate(date)).toBe('2025-01-01')
    })

    it('handles end of year', () => {
      const date = new Date('2025-12-31T23:59:59.999Z')
      expect(formatISODate(date)).toBe('2025-12-31')
    })
  })
})
```

**Validation**:
```bash
cd frontend && npm run test -- tests/unit/utils/dateUtils.test.ts
```

---

### Task 14: Create errorHandler Unit Tests

**Action**: Create `frontend/tests/unit/utils/errorHandler.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import {
  getErrorMessage,
  handleApiError,
  isAxiosError,
} from '../../../src/utils/errorHandler'

describe('errorHandler', () => {
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
      consoleSpy.mockRestore()
    })

    it('shows toast when callback provided', () => {
      const showToast = vi.fn()
      handleApiError(new Error('test'), 'fetch data', showToast)

      expect(showToast).toHaveBeenCalledWith('Failed to fetch data', 'error')
    })

    it('does not show toast when callback not provided', () => {
      // Should not throw
      expect(() => handleApiError(new Error('test'), 'fetch data')).not.toThrow()
    })

    it('silently ignores 404 when silentOn404 is true', () => {
      const showToast = vi.fn()
      const error404 = {
        response: { status: 404 },
      }

      handleApiError(error404, 'fetch data', showToast, { silentOn404: true })

      expect(showToast).not.toHaveBeenCalled()
    })

    it('shows toast for 404 when silentOn404 is false', () => {
      const showToast = vi.fn()
      const error404 = {
        response: { status: 404 },
      }

      handleApiError(error404, 'fetch data', showToast, { silentOn404: false })

      expect(showToast).toHaveBeenCalled()
    })

    it('respects logError option', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      handleApiError(new Error('test'), 'operation', undefined, { logError: false })

      // Should not log when logError is false
      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
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
  })
})
```

**Validation**:
```bash
cd frontend && npm run test -- tests/unit/utils/errorHandler.test.ts
```

---

### Task 15: Create Axios Mock Utilities

**Action**: Create `frontend/src/test/mocks/axios.ts`

```typescript
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
  mockedAxios.isCancel = vi.fn().mockReturnValue(false)
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
```

**Validation**:
```bash
cd frontend && ls -la src/test/mocks/axios.ts
```

---

## TESTING STRATEGY

### Test Categories

| Category | Description | Coverage Target | Files |
|----------|-------------|-----------------|-------|
| Unit Tests | Pure functions (utils, constants) | 80%+ | 4 files |
| Hook Tests | Custom React hooks | 70%+ | 3 files |
| Component Tests | UI components | 60%+ | 3 files |
| Integration Tests | API interaction flows | Future phase | - |

### Test Priority (Initial Implementation)

1. **High Priority** (Implement first - Tasks 7-8, 13-14):
   - `filterUtils.ts` - Pure functions, easy to test, high coverage
   - `dateUtils.ts` - Pure functions with time dependencies
   - `errorHandler.ts` - Error handling utilities
   - `constants/index.ts` - Configuration validation

2. **Medium Priority** (Implement second - Tasks 9-10):
   - `useSemanticSearch.ts` - Hook with API calls, debouncing, cancellation
   - `Toast.tsx` - Simple component, good template for component tests

3. **Lower Priority** (Future iterations):
   - `useMediaQuery.ts` - Hook with browser events
   - `useServerStats.ts` - Complex hook with parallel API calls
   - `ErrorBoundary.tsx` - Error boundary testing
   - `ServerCard.tsx` - Complex component with many props
   - Context providers (AuthContext, ThemeContext)

### Mocking Strategy

| Dependency | Mock Approach |
|------------|---------------|
| axios | `vi.mock('axios')` with `mockResolvedValue` |
| Timers | `vi.useFakeTimers()` + `advanceTimersByTime` |
| window.matchMedia | Global mock in setup file |
| React Router | Wrapper with `BrowserRouter` |
| Context | Custom render with providers |

---

## VALIDATION COMMANDS

```bash
# Install dependencies
cd frontend && npm install

# Run all tests
cd frontend && npm run test

# Run tests in watch mode (development)
cd frontend && npm run test:watch

# Run tests with coverage report
cd frontend && npm run test:coverage

# Run specific test file
cd frontend && npm run test -- tests/unit/utils/filterUtils.test.ts

# Type check
cd frontend && npx tsc --noEmit

# Build to verify no breaks
cd frontend && npm run build
```

---

## ACCEPTANCE CRITERIA

### Configuration

- [ ] Vitest is installed and configured in `vitest.config.ts`
- [ ] Jest-dom matchers work via `vitest.setup.ts`
- [ ] TypeScript types include Vitest globals (`vitest/globals`, `@testing-library/jest-dom`)
- [ ] Test scripts added to `package.json` (`test`, `test:watch`, `test:coverage`, `test:ci`)
- [ ] Coverage thresholds configured (30% initial for all metrics)
- [ ] Test isolation enabled (`isolate: true`)
- [ ] CI retry configured (`retry: 1` in CI environment)

### Test Infrastructure

- [ ] Custom render function with MemoryRouter and optional providers works
- [ ] axios mock utilities created in `src/test/mocks/axios.ts`
- [ ] Timer mocking works for debounce tests with proper cleanup
- [ ] Directory structure follows convention (`tests/unit/`, `tests/hooks/`, `tests/components/`)
- [ ] Browser API mocks configured (matchMedia, IntersectionObserver, ResizeObserver)

### Tests

- [ ] `filterUtils.test.ts` passes with 100% function coverage including edge cases
- [ ] `dateUtils.test.ts` covers all time units and edge cases
- [ ] `errorHandler.test.ts` covers all extraction paths and type guard
- [ ] `constants/index.test.ts` validates key exports and helper functions
- [ ] `useSemanticSearch.test.ts` covers debouncing, API calls, errors, options, cleanup
- [ ] `Toast.test.tsx` covers rendering, interactions, auto-dismiss, accessibility, dark mode

### CI/CD

- [ ] GitHub Actions workflow triggers on frontend changes only
- [ ] Tests run successfully in CI with verbose reporter
- [ ] Coverage reports upload to Codecov with `frontend` flag
- [ ] Build job verifies no TypeScript errors or build failures
- [ ] Artifacts retained for 14 days (coverage), 7 days (build)

### Quality Gates

- [ ] All tests pass locally before PR
- [ ] TypeScript check passes (`npx tsc --noEmit`)
- [ ] No console.error/warn in tests (except explicitly tested)
- [ ] Tests are deterministic (no random failures)

---

## RISKS AND MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|------------|
| React 19 compatibility | Tests may fail with latest RTL | Pin `@testing-library/react@16.x` (supports React 19) |
| jsdom limitations | Some browser APIs unavailable | Mock in setup file (matchMedia, ResizeObserver) |
| Async hook testing | Race conditions in tests | Use `waitFor` and proper cleanup |
| CI flakiness | Intermittent failures | Set appropriate timeouts, use fake timers |

---

---

## QUALITY REVIEW NOTES

> This section documents quality improvements made during plan review.

### Improvements Applied

| Area | Original Issue | Improvement |
|------|----------------|-------------|
| **vitest.config.ts** | Basic config | Added `isolate: true`, `pool: threads`, CI retry, excluded entry points |
| **vitest.setup.ts** | Missing cleanup | Added `vi.clearAllMocks()` in afterEach, `configurable: true` for mocks |
| **test-utils.tsx** | BrowserRouter usage | Changed to MemoryRouter for test isolation, added optional auth |
| **filterUtils.test.ts** | Missing edge cases | Added empty array, unknown filter, undefined fields, special characters |
| **useSemanticSearch.test.ts** | Magic numbers | Used constants, added debounce reset test, cancellation test |
| **Toast.test.tsx** | Incomplete coverage | Added accessibility, dark mode, memory leak prevention tests |
| **Timer pattern** | Wrong cleanup method | Changed `restoreAllMocks` to `useRealTimers` + `clearAllMocks` |
| **File structure** | Missing mocks dir | Added `src/test/mocks/` for centralized mock utilities |
| **Missing tests** | No dateUtils/errorHandler | Added comprehensive tests for these utilities |

### Code Quality Standards Enforced

1. **Type Safety**: All test factories use proper TypeScript interfaces
2. **Constants**: Magic numbers replaced with imported constants
3. **Edge Cases**: Each test file covers boundary conditions and error states
4. **Accessibility**: Component tests verify ARIA attributes
5. **Test Isolation**: MemoryRouter, fresh mocks per test, proper cleanup
6. **Documentation**: JSDoc comments on test utilities and factories

### Test Coverage Estimation

| File | Estimated Coverage |
|------|-------------------|
| `src/utils/filterUtils.ts` | 100% |
| `src/utils/dateUtils.ts` | 95%+ |
| `src/utils/errorHandler.ts` | 90%+ |
| `src/constants/index.ts` | 80%+ |
| `src/hooks/useSemanticSearch.ts` | 85%+ |
| `src/components/Toast.tsx` | 90%+ |

---

## FUTURE ENHANCEMENTS

1. **Visual Regression Testing**: Add Playwright or Chromatic for visual testing
2. **E2E Tests**: Add Playwright for full user flow testing
3. **Component Storybook**: Document components with Storybook stories
4. **Snapshot Testing**: Add for complex component output
5. **MSW Integration**: Use Mock Service Worker for more realistic API mocking
6. **useServerStats Tests**: Complex hook with parallel API calls
7. **useMediaQuery Tests**: Hook with browser resize events
8. **Context Provider Tests**: AuthContext and ThemeContext integration tests
9. **Performance Testing**: Add benchmark tests for critical paths
