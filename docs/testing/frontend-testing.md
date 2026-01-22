# Frontend Testing Guide

Comprehensive testing documentation for the MCP Gateway Registry React frontend.

## Overview

The frontend uses a modern testing stack:

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | 4.x | Test runner (fast, ESM-native) |
| React Testing Library | 16.x | Component testing (React 19 compatible) |
| @testing-library/jest-dom | 6.x | DOM matchers |
| @testing-library/user-event | 14.x | User interaction simulation |
| v8 | - | Coverage provider |

## Quick Start

```bash
cd frontend

# Run all tests
npm test

# Watch mode (recommended for development)
npm run test:watch

# With Vitest UI
npm run test:ui

# With coverage
npm run test:coverage

# CI mode (verbose output)
npm run test:ci
```

## Test Structure

```
frontend/
├── tests/
│   ├── components/           # Component tests
│   │   └── Toast.test.tsx
│   ├── hooks/                # Custom hook tests
│   │   └── useSemanticSearch.test.ts
│   ├── unit/                 # Unit tests
│   │   ├── constants/        # Constants tests
│   │   │   └── index.test.ts
│   │   └── utils/            # Utility function tests
│   │       ├── filterUtils.test.ts
│   │       ├── dateUtils.test.ts
│   │       └── errorHandler.test.ts
│   └── reports/
│       └── coverage/         # Coverage reports
├── src/test/
│   ├── test-utils.tsx        # Custom render with providers
│   └── mocks/
│       └── axios.ts          # Axios mock utilities
├── vitest.config.ts          # Vitest configuration
└── vitest.setup.ts           # Test setup and mocks
```

## Configuration

### vitest.config.ts

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/build/**'],
    isolate: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './tests/reports/coverage',
      include: ['src/**/*.{ts,tsx}'],
      thresholds: {
        statements: 8,
        branches: 5,
        functions: 5,
        lines: 8,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    retry: process.env.CI ? 1 : 0,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
```

### vitest.setup.ts

The setup file configures:

- **jest-dom matchers**: Extended DOM assertions
- **localStorage mock**: For ThemeContext
- **matchMedia mock**: For responsive components
- **IntersectionObserver mock**: For lazy loading
- **ResizeObserver mock**: For responsive components
- **Automatic cleanup**: After each test

## Test Utilities

### Custom Render (`src/test/test-utils.tsx`)

Wraps components with necessary providers:

```typescript
import { render, screen, waitFor } from '../src/test/test-utils'

// Renders with MemoryRouter (not BrowserRouter for test isolation)
// and ThemeProvider
render(<MyComponent />)

// All @testing-library/react exports are re-exported
expect(screen.getByText('Hello')).toBeInTheDocument()
```

### Axios Mocks (`src/test/mocks/axios.ts`)

```typescript
import {
  resetAxiosMocks,
  mockAxiosSuccess,
  mockAxiosError,
  mockAxiosNetworkError,
  mockAxiosPending,
  mockedAxios
} from '../src/test/mocks/axios'

beforeEach(() => {
  resetAxiosMocks()
})

// Mock successful response
mockAxiosSuccess({ users: [] }, 'get')

// Mock error response
mockAxiosError(404, 'Not found', 'get')

// Mock network error
mockAxiosNetworkError('post')

// Mock pending request (for loading states)
const { resolve, reject } = mockAxiosPending<UserData>('get')
// Later: resolve({ name: 'Test' }) or reject(new Error())
```

## Writing Tests

### Component Tests

```typescript
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../src/test/test-utils'
import { Toast, type ToastType } from '../../src/components/Toast'

describe('Toast', () => {
  const defaultProps = {
    message: 'Test message',
    type: 'success' as ToastType,
    onClose: vi.fn(),
  }

  it('renders message', () => {
    render(<Toast {...defaultProps} />)
    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  it('applies correct styling for type', () => {
    render(<Toast {...defaultProps} type="error" />)
    const toast = screen.getByRole('alert')
    expect(toast).toHaveClass('bg-red-50')
  })

  it('calls onClose when close button clicked', async () => {
    vi.useRealTimers() // userEvent needs real timers
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(<Toast {...defaultProps} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: /close/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
    vi.useFakeTimers() // restore
  })

  it('auto-dismisses after timeout', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()

    render(<Toast {...defaultProps} onClose={onClose} autoDismiss={3000} />)

    expect(onClose).not.toHaveBeenCalled()
    vi.advanceTimersByTime(3000)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
```

### Hook Tests

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import axios from 'axios'
import { useSemanticSearch } from '../../src/hooks/useSemanticSearch'

vi.mock('axios')
const mockedAxios = vi.mocked(axios, true)

describe('useSemanticSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    ;(mockedAxios.isCancel as unknown) = vi.fn().mockReturnValue(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null results for empty query', () => {
    const { result } = renderHook(() => useSemanticSearch(''))
    expect(result.current.results).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('debounces API calls', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { results: [] } })

    const { rerender } = renderHook(
      ({ query }) => useSemanticSearch(query),
      { initialProps: { query: '' } }
    )

    rerender({ query: 'te' })
    rerender({ query: 'tes' })
    rerender({ query: 'test' })

    // API not called yet (debouncing)
    expect(mockedAxios.post).not.toHaveBeenCalled()

    // After debounce period
    await act(async () => {
      vi.advanceTimersByTime(300) // DEBOUNCE_MS
      await vi.runAllTimersAsync()
    })

    expect(mockedAxios.post).toHaveBeenCalledTimes(1)
  })
})
```

### Utility Tests

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatTimeSince } from '../../../src/utils/dateUtils'

describe('formatTimeSince', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for recent times', () => {
    const now = new Date()
    expect(formatTimeSince(now.toISOString())).toBe('just now')
  })

  it('formats minutes correctly', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    expect(formatTimeSince(fiveMinutesAgo.toISOString())).toBe('5 minutes ago')
  })

  it('handles null input', () => {
    expect(formatTimeSince(null)).toBe('Unknown')
  })
})
```

## Common Patterns

### Testing with Fake Timers

```typescript
describe('timer tests', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('advances time', () => {
    const callback = vi.fn()
    setTimeout(callback, 1000)

    vi.advanceTimersByTime(1000)
    expect(callback).toHaveBeenCalled()
  })
})
```

### Testing Async Operations with Debouncing

```typescript
await act(async () => {
  vi.advanceTimersByTime(DEBOUNCE_MS)
  await vi.runAllTimersAsync() // Important for async operations
})
```

### Testing with userEvent

```typescript
// userEvent requires real timers
it('handles user input', async () => {
  vi.useRealTimers()
  const user = userEvent.setup()

  render(<Input />)
  await user.type(screen.getByRole('textbox'), 'hello')

  expect(screen.getByRole('textbox')).toHaveValue('hello')
  vi.useFakeTimers() // restore for subsequent tests
})
```

### Mocking axios.isCancel

The `isCancel` function is a type predicate, requiring special handling:

```typescript
// Type assertion needed
;(mockedAxios.isCancel as unknown) = vi.fn().mockReturnValue(false)

// For cancelled requests
;(mockedAxios.isCancel as unknown) = vi.fn().mockReturnValue(true)
```

## Coverage

### Thresholds

Current thresholds (will increase as coverage improves):

| Metric | Threshold |
|--------|-----------|
| Statements | 8% |
| Branches | 5% |
| Functions | 5% |
| Lines | 8% |

### High-Coverage Files

| File | Coverage |
|------|----------|
| `constants/index.ts` | 100% |
| `components/Toast.tsx` | 100% |
| `hooks/useSemanticSearch.ts` | 100% |
| `utils/filterUtils.ts` | 100% |
| `utils/errorHandler.ts` | 100% |
| `utils/dateUtils.ts` | 88% |

### Generating Reports

```bash
npm run test:coverage

# Reports generated at:
# - tests/reports/coverage/index.html (HTML)
# - tests/reports/coverage/lcov.info (LCOV for Codecov)
```

## CI/CD Integration

Tests run via GitHub Actions (`.github/workflows/frontend-test.yml`):

```yaml
name: Frontend Tests

on:
  push:
    branches: [main, develop]
    paths:
      - 'frontend/**'
  pull_request:
    branches: [main, develop]
    paths:
      - 'frontend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run test:ci
      - uses: codecov/codecov-action@v4
        with:
          files: frontend/tests/reports/coverage/lcov.info
          flags: frontend
```

## Troubleshooting

### Tests hang or timeout

**Cause**: userEvent with fake timers

**Solution**: Switch to real timers for userEvent tests:

```typescript
vi.useRealTimers()
const user = userEvent.setup()
// ... test
vi.useFakeTimers() // restore
```

### TypeScript errors with mocks

**Cause**: Type predicates can't be directly mocked

**Solution**: Use type assertion:

```typescript
;(mockedAxios.isCancel as unknown) = vi.fn().mockReturnValue(false)
```

### Coverage too low

**Solution**: Check uncovered files:

```bash
npm run test:coverage
# Review tests/reports/coverage/index.html
```

### ThemeContext errors

**Cause**: localStorage not available in jsdom

**Solution**: Ensure `vitest.setup.ts` includes localStorage mock (already configured)

## Best Practices

1. **Use custom render**: Always use `render` from `test-utils.tsx` for provider wrapping
2. **Query by role**: Prefer `getByRole` for accessibility testing
3. **Avoid implementation details**: Test behavior, not implementation
4. **Use data-testid sparingly**: Only when no semantic query works
5. **Clean up mocks**: Call `vi.clearAllMocks()` in `beforeEach`
6. **Isolate tests**: Each test should be independent
7. **Test edge cases**: null, undefined, empty arrays, boundary values

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [jest-dom Matchers](https://github.com/testing-library/jest-dom)
