# MCP Gateway Registry Frontend

React-based frontend for the MCP Gateway Registry application.

## Development Setup

### Prerequisites

- Node.js 16+ and npm
- Backend server running on `http://localhost:7860` (configured in `package.json` proxy)

### Installation

```bash
npm install
```

Note: The postinstall script will automatically apply patches to dependencies.

### Running Development Server

```bash
npm start
```

The development server will start on `http://localhost:3000`.

## Important Configuration Notes

### webpack-dev-server v5 Compatibility Patch

This project uses `react-scripts` v5.0.1, which has a compatibility issue with `webpack-dev-server` v5. The project includes a patch to fix this issue.

**Problem**: react-scripts v5.0.1 uses deprecated webpack-dev-server hooks (`onBeforeSetupMiddleware` and `onAfterSetupMiddleware`) that were removed in webpack-dev-server v5.

**Solution**: We use `patch-package` to apply a patch that replaces the deprecated hooks with the modern `setupMiddlewares` API.

**Patch Location**: `patches/react-scripts+5.0.1.patch`

**How it Works**:

1. The patch modifies `node_modules/react-scripts/config/webpackDevServer.config.js`
2. Replaces deprecated hooks with `setupMiddlewares` function
3. The patch is automatically applied after `npm install` via the postinstall script

**If you encounter webpack-dev-server errors**:

1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` to reinstall dependencies and reapply the patch
3. If the patch fails, check the `patches/react-scripts+5.0.1.patch` file for conflicts

## Available Scripts

### Development

- `npm start` - Start the development server
- `npm run build` - Build the production bundle
- `npm run lint` - Run ESLint

### Testing

- `npm test` - Run tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Run tests with Vitest UI
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:ci` - Run tests for CI (verbose, coverage)

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router v6
- Heroicons
- Axios

### Testing Stack

- Vitest 4.x - Test runner
- React Testing Library v16 - Component testing
- @testing-library/jest-dom v6 - DOM matchers
- @testing-library/user-event v14 - User interaction simulation
- v8 - Coverage provider

## Project Structure

```
frontend/
├── src/
│   ├── components/    # Reusable React components
│   ├── constants/     # Application constants
│   ├── contexts/      # React Context providers
│   ├── hooks/         # Custom React hooks
│   ├── pages/         # Page components
│   ├── test/          # Test utilities and mocks
│   │   ├── test-utils.tsx    # Custom render with providers
│   │   └── mocks/            # Mock utilities (axios, etc.)
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Utility functions
│   └── App.tsx        # Main application component
├── tests/             # Test files
│   ├── components/    # Component tests
│   ├── hooks/         # Hook tests
│   ├── unit/          # Unit tests for utilities
│   │   ├── constants/ # Constants tests
│   │   └── utils/     # Utility function tests
│   └── reports/       # Test coverage reports
├── public/            # Static assets
├── patches/           # Dependency patches (managed by patch-package)
├── vitest.config.ts   # Vitest configuration
├── vitest.setup.ts    # Test setup (mocks, matchers)
└── package.json
```

## Dependencies Management

### Using patch-package

This project uses `patch-package` to maintain patches for third-party dependencies. If you need to modify a dependency:

1. Make changes to files in `node_modules/`
2. Run `npx patch-package <package-name>`
3. Commit the generated patch file in `patches/` directory

The patches will be automatically applied after `npm install` via the postinstall script.

## Testing

The frontend uses **Vitest** as the test runner with React Testing Library for component testing.

### Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode (recommended for development)
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run specific test file
npm test -- tests/components/Toast.test.tsx

# Run tests matching pattern
npm test -- -t "Toast"
```

### Test Statistics

| Metric | Value |
|--------|-------|
| Total Tests | 103 |
| Test Files | 6 |
| Test Duration | ~1.2s |

### Coverage

Current coverage thresholds (configured in `vitest.config.ts`):

| Metric | Threshold |
|--------|-----------|
| Statements | 8% |
| Branches | 5% |
| Functions | 5% |
| Lines | 8% |

Generate a detailed coverage report:

```bash
npm run test:coverage
# View HTML report at tests/reports/coverage/index.html
```

### Test Categories

| Category | Location | Description |
|----------|----------|-------------|
| Unit Tests | `tests/unit/` | Utility functions, constants |
| Hook Tests | `tests/hooks/` | Custom React hooks |
| Component Tests | `tests/components/` | React components |

### Writing Tests

#### Component Test Example

```typescript
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../src/test/test-utils'
import { MyComponent } from '../../src/components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('handles user interaction', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(<MyComponent onClick={onClick} />)
    await user.click(screen.getByRole('button'))

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
```

#### Hook Test Example

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMyHook } from '../../src/hooks/useMyHook'

describe('useMyHook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => useMyHook())
    expect(result.current.value).toBe(null)
  })
})
```

### Test Utilities

#### Custom Render (`src/test/test-utils.tsx`)

Wraps components with necessary providers (Router, Theme):

```typescript
import { render } from '../../src/test/test-utils'

// Automatically includes MemoryRouter and ThemeProvider
render(<MyComponent />)
```

#### Axios Mocks (`src/test/mocks/axios.ts`)

```typescript
import { resetAxiosMocks, mockAxiosSuccess, mockAxiosError } from '../../src/test/mocks/axios'

beforeEach(() => {
  resetAxiosMocks()
})

it('handles success', async () => {
  mockAxiosSuccess({ data: 'test' }, 'get')
  // ... test code
})

it('handles error', async () => {
  mockAxiosError(404, 'Not found', 'get')
  // ... test code
})
```

### CI/CD Integration

Tests run automatically via GitHub Actions on:

- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop`

The workflow (`.github/workflows/frontend-test.yml`):

1. Installs dependencies
2. Runs TypeScript type check
3. Runs tests with coverage
4. Uploads coverage to Codecov
5. Builds the application

### Troubleshooting

#### Tests timing out with userEvent

When using `userEvent` with fake timers, switch to real timers:

```typescript
it('handles click', async () => {
  vi.useRealTimers() // userEvent needs real timers
  const user = userEvent.setup()
  await user.click(button)
  vi.useFakeTimers() // restore for subsequent tests
})
```

#### TypeScript errors with axios.isCancel

Use type assertion for the type predicate:

```typescript
;(mockedAxios.isCancel as unknown) = vi.fn().mockReturnValue(false)
```

#### Async hook tests with debouncing

Use `vi.runAllTimersAsync()` for reliable async testing:

```typescript
await act(async () => {
  vi.advanceTimersByTime(DEBOUNCE_MS)
  await vi.runAllTimersAsync()
})
```

For more details, see:

- [Frontend Testing Guide](../docs/testing/frontend-testing.md)
- [Vitest Documentation](https://vitest.dev/)
