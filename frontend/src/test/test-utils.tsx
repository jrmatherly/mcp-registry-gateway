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
