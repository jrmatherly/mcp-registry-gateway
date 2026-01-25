# MCP Registry Frontend UI Enterprise Enhancement Plan

**Created**: 2026-01-25
**Status**: Draft - Pending Approval
**Scope**: Comprehensive UI/UX overhaul for enterprise readiness

---

## Executive Summary

This plan outlines a comprehensive enhancement of the MCP Servers & A2A Agents Registry frontend to improve user experience, accessibility, and enterprise readiness. The implementation follows a quality-first approach with no hard timeline constraints, ensuring consistent design language across all screens.

### Target Users
- **Platform Administrators**: Managing 100+ servers across multiple teams
- **Developers**: Discovering and connecting to MCP servers
- **Security Teams**: Auditing access and monitoring health

### Design Philosophy
- Professional, muted color palette suitable for extended use
- Consistent component patterns across all screens
- Accessibility-first (WCAG AA compliance)
- Scalable from small teams to enterprise deployments

---

## Phase 1: Foundation & Design System

**Goal**: Establish consistent design tokens and component patterns before feature work.

### 1.1 Color Palette Refinement

**Current Issues**:
- Vibrant green (#4ADE80) can cause eye fatigue
- Binary health states (healthy/unhealthy) lack nuance
- Some contrast ratios may not meet WCAG AA

**Proposed Enterprise Palette**:

```css
/* Primary - Muted Teal/Cyan */
--color-primary-50: #f0fdfa;
--color-primary-100: #ccfbf1;
--color-primary-200: #99f6e4;
--color-primary-300: #5eead4;
--color-primary-400: #2dd4bf;
--color-primary-500: #14b8a6;  /* Primary action */
--color-primary-600: #0d9488;
--color-primary-700: #0f766e;
--color-primary-800: #115e59;
--color-primary-900: #134e4a;

/* Status Colors */
--color-success: #22c55e;      /* Healthy */
--color-warning: #f59e0b;      /* Degraded/Warning - NEW */
--color-error: #ef4444;        /* Unhealthy/Error */
--color-info: #3b82f6;         /* Informational */

/* Neutral (Dark Theme) */
--color-bg-primary: #0f0f14;
--color-bg-secondary: #1a1a24;
--color-bg-tertiary: #252532;
--color-bg-card: #1e1e2a;
--color-border: #2e2e3a;
--color-text-primary: #f4f4f5;
--color-text-secondary: #a1a1aa;
--color-text-muted: #71717a;
```

**Deliverables**:
- [ ] Create `frontend/src/styles/design-tokens.css`
- [ ] Update Tailwind config with new color variables
- [ ] Document color usage guidelines
- [ ] Ensure all colors pass WCAG AA contrast checks

### 1.2 Component Library Strategy

**Recommendation**: Adopt **Aceternity UI Pro** components

**Rationale**:
- **Already owned** - template available at `.archive/ai-saas-template/`
- Compatible with React 19 and Tailwind CSS (minor config adjustments needed)
- Framer Motion-powered animations for premium, polished feel
- Built on Radix UI primitives (excellent accessibility)
- Professional enterprise aesthetic with smooth micro-interactions
- Copy-paste model gives full control (no vendor lock-in)

**Aceternity UI Pro Components Available**:
| Component | Description | Use Case |
|-----------|-------------|----------|
| `Button` | 3 variants (simple, outline, primary) | Primary actions |
| `Badge` | Animated badge with gradient | Status indicators |
| `Switch` | Framer Motion animated toggle | Enable/disable servers |
| `Form` + `Label` | react-hook-form integration | Edit/Register forms |
| `NavBar` | Desktop + Mobile responsive navbar | Header navigation |
| `ModeToggle` | Animated light/dark theme switch | Theme toggle |
| `Container` | Responsive max-width wrapper | Layout |
| `Heading` | Size variants with balanced text | Page/section titles |
| `GridFeatures` | Hover effect feature cards | Dashboard cards |
| `InfiniteMovingCards` | Marquee animation | Testimonials/logos |
| `AnimatedTooltip` | Animated hover tooltips | Help text |
| `GridLines` | Background decorative grid | Visual polish |
| `InViewDiv` | Animation on scroll into view | Page transitions |
| `Skeletons` | Loading placeholder components | Loading states |

**Key Dependencies to Add**:
```json
{
  "dependencies": {
    "framer-motion": "^12.0.0-alpha.1",
    "@radix-ui/react-label": "^2.0.2",
    "@tabler/icons-react": "^3.5.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0",
    "react-wrap-balancer": "^1.1.0",
    "react-hook-form": "^7.x",
    "@hookform/resolvers": "^3.x"
  }
}
```

**Migration Notes (Next.js → Vite/React)**:
- Remove `"use client"` directives (Vite doesn't use server components)
- Replace `next-themes` with custom theme context or `react-theme-toggler`
- Replace `next/image` with standard `<img>` or Vite image plugins
- Replace `next/link` with `react-router-dom` `<Link>`
- Update import aliases (`@/` paths) in `vite.config.ts`

**Implementation Steps**:
- [ ] Add Aceternity dependencies to `frontend/package.json`
- [ ] Copy `lib/utils.ts` (cn function) to `frontend/src/lib/utils.ts`
- [ ] Copy Tailwind config animations and shadows to `frontend/tailwind.config.js`
- [ ] Create `frontend/src/components/ui/` directory for Aceternity components
- [ ] Port components one-by-one, adapting for Vite/React Router
- [ ] Migrate existing components incrementally
- [ ] Create component documentation (optional Phase 2)

### 1.3 Typography & Spacing

**Current**: Appears to use system fonts with inconsistent spacing

**Proposed**:
```css
/* Font Stack */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Type Scale */
--text-xs: 0.75rem;    /* 12px - labels, badges */
--text-sm: 0.875rem;   /* 14px - body small, captions */
--text-base: 1rem;     /* 16px - body */
--text-lg: 1.125rem;   /* 18px - lead text */
--text-xl: 1.25rem;    /* 20px - card titles */
--text-2xl: 1.5rem;    /* 24px - section headers */
--text-3xl: 1.875rem;  /* 30px - page titles */

/* Spacing Scale (4px base) */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
```

**Deliverables**:
- [ ] Add Inter and JetBrains Mono fonts
- [ ] Create typography utility classes
- [ ] Establish consistent spacing throughout app

---

## Phase 2: Navigation & Layout Architecture

**Goal**: Simplify navigation, eliminate redundancy, improve information hierarchy.

### 2.1 Header Consolidation

**Current Issues**:
- "Register Server" button appears in 2 locations
- Button group (Register Server/MCP Servers/A2A Agents/Refresh All) duplicates tab functionality
- User info in sidebar takes valuable space

**Proposed Header Structure**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [≡] [Logo] MCP Registry                    [🔍] [?] [🔔] [Theme] [Avatar ▾] │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Changes**:
- [ ] Remove button group from main content area
- [ ] Single "Register Server" as primary CTA (+ button in header OR floating action)
- [ ] Move user profile to avatar dropdown (already partially implemented)
- [ ] Add notification bell for health alerts (enterprise feature)
- [ ] Add global search shortcut indicator (Cmd+K)

### 2.2 Sidebar Redesign

**Current Issues**:
- User card takes ~150px of prime sidebar space
- Statistics section duplicates filter counts
- Limited filtering options

**Proposed Sidebar Structure**:
```
┌──────────────────────────────┐
│ [Collapsed User Summary]     │  <- Single line: "admin (Admin)"
├──────────────────────────────┤
│ 🔍 Quick Search               │  <- New: inline search
├──────────────────────────────┤
│ FILTERS                      │
│ ├── Status                   │
│ │   ○ All Services (16)      │
│ │   ○ Enabled (11)           │
│ │   ○ Disabled (5)           │
│ │   ○ With Issues (1)        │
│ ├── Health                   │  <- New filter group
│ │   ○ All                    │
│ │   ○ Healthy                │
│ │   ○ Degraded               │
│ │   ○ Unhealthy              │
│ ├── Type                     │
│ │   ○ All                    │
│ │   ○ MCP Servers            │
│ │   ○ A2A Agents             │
│ ├── Tags                     │  <- New: tag-based filter
│ │   [Tag multiselect]        │
│ └── Owner/Team               │  <- Enterprise: RBAC filter
│     [Team multiselect]       │
├──────────────────────────────┤
│ QUICK ACCESS                  │  <- New section
│ ├── ⭐ Favorites (3)         │
│ ├── 🕐 Recently Viewed (5)   │
│ └── 📁 My Servers (8)        │
├──────────────────────────────┤
│ ─────────────────────────────│
│ 📊 16 Total │ 🟢 11 │ 🔴 1   │  <- Compact stats bar
└──────────────────────────────┘
```

**Deliverables**:
- [ ] Create new `Sidebar.tsx` component with collapsible sections
- [ ] Implement multi-select tag filter
- [ ] Add "Favorites" functionality with localStorage/backend persistence
- [ ] Add "Recently Viewed" tracking
- [ ] Create compact statistics bar component

### 2.3 Tab Navigation Simplification

**Current**: Two layers (button group + tabs) with overlapping functionality

**Proposed**: Single tab bar with clear hierarchy
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ All (16)  │  MCP Servers (6)  │  A2A Agents (10)  │  External Registries    │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Changes**:
- [ ] Remove top button group entirely
- [ ] Style tabs as primary navigation
- [ ] Add count badges to tabs
- [ ] Ensure tab state persists in URL for shareability

---

## Phase 3: Dashboard & Card Components

**Goal**: Create consistent, scannable cards with improved health visibility and bulk actions.

### 3.1 Server/Agent Card Redesign

**Current Issues**:
- Icon-only action buttons lack accessibility
- Health status dots are too small
- Rating section takes space when empty
- Inconsistent information density
- "1 Tools" grammar error

**Proposed Card Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│ [□] [Icon] Server Name                              [⋮ Menu]    │
│     /path/to/server                                             │
│                                                                 │
│ Description text that can span multiple lines with proper       │
│ truncation and "Show more" expansion...                         │
│                                                                 │
│ ┌───────┐ ┌───────┐ ┌───────┐ ┌─────┐                          │
│ │ #Tag1 │ │ #Tag2 │ │ #Tag3 │ │ +2  │                          │
│ └───────┘ └───────┘ └───────┘ └─────┘                          │
│                                                                 │
│ ────────────────────────────────────────────────────────────── │
│                                                                 │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│ │ 🟢 Healthy   │  │ 🔧 42 Tools  │  │ ⭐ 4.2 (12)  │           │
│ └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                 │
│ ────────────────────────────────────────────────────────────── │
│                                                                 │
│ [Enabled ●━━━○]      Last checked: 13s ago      [↻ Refresh]    │
└─────────────────────────────────────────────────────────────────┘
```

**Key Changes**:
- [ ] Add checkbox for bulk selection (left side)
- [ ] Larger, badge-style health indicators with icons
- [ ] Proper pluralization ("1 Tool" vs "42 Tools")
- [ ] Hide rating section when no ratings (or show "Be first to rate")
- [ ] Expandable description with "Show more"
- [ ] Accessible action menu (kebab menu with labeled options)
- [ ] Clearer last-checked timestamp with refresh button

### 3.2 Health Status System

**Current**: Binary (Healthy/Unhealthy) with small colored dots

**Proposed**: Three-state system with prominent badges

| State | Color | Icon | Description |
|-------|-------|------|-------------|
| Healthy | Green (#22c55e) | ✓ | All checks passing |
| Degraded | Amber (#f59e0b) | ⚠ | Partial issues, still operational |
| Unhealthy | Red (#ef4444) | ✕ | Server unreachable or failing |

**Implementation**:
- [ ] Create `HealthBadge.tsx` component with three states
- [ ] Add tooltip explaining what health checks measure
- [ ] Include last check timestamp in tooltip
- [ ] Add health history sparkline (optional, Phase 2)

### 3.3 Bulk Actions Toolbar

**New Feature**: Appears when items are selected

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ☑ 3 selected    [Enable All] [Disable All] [Refresh Health] [Export] [···] │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Deliverables**:
- [ ] Create `BulkActionsBar.tsx` component
- [ ] Implement select all / deselect all
- [ ] Add keyboard shortcut support (Shift+Click for range select)
- [ ] Bulk enable/disable API integration
- [ ] Bulk health refresh
- [ ] Export selected as JSON/CSV

### 3.4 Sorting & View Options

**New Feature**: Sort dropdown and view toggle

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Showing 6 servers    Sort: [Name ▾]  [A-Z │ Health │ Tools │ Updated]     │
│                                                      View: [▦ Grid] [≡ List]│
└────────────────────────────────────────────────────────────────────────────┘
```

**Deliverables**:
- [ ] Create `SortDropdown.tsx` with options: Name, Health, Tool Count, Last Updated, Rating
- [ ] Implement ascending/descending toggle
- [ ] Add List view option (compact table-like layout)
- [ ] Persist view preference in localStorage

---

## Phase 4: Forms & Modals

**Goal**: Improve form UX, validation feedback, and modal consistency.

### 4.1 Edit Server Modal Improvements

**Current Issues** (from screenshot):
- Fields feel cramped
- "Number of Tools" and "Stars" appear editable but are metadata
- No visible validation feedback
- Missing explicit Cancel button
- No form sections/grouping

**Proposed Redesign**:
```
┌─────────────────────────────────────────────────────────────────┐
│ Edit Server: Atlassian                                    [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BASIC INFORMATION                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Server Name *                                            │   │
│  │ [Atlassian                                        ]      │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Proxy URL *                                              │   │
│  │ [http://atlassian-server:8005/mcp/                ]      │   │
│  │ ✓ URL format valid                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Description                                              │   │
│  │ [                                                   ]    │   │
│  │ [                                                   ]    │   │
│  │ 0/500 characters                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  CATEGORIZATION                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Tags                                                     │   │
│  │ [Atlassian] [Jira] [Confluence] [+ Add tag]             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ License                                                  │   │
│  │ [MIT                                              ] ▾    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  SERVER METADATA (Read-only)                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Tools: 42  │  Stars: 0  │  Registered: Jan 15, 2026     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Save Changes]           │
└─────────────────────────────────────────────────────────────────┘
```

**Deliverables**:
- [ ] Group fields into logical sections
- [ ] Add real-time validation with inline feedback
- [ ] Make metadata fields clearly read-only
- [ ] Add character counters for text fields
- [ ] Implement tag input with autocomplete
- [ ] Add Cancel and Save buttons with proper styling
- [ ] Show unsaved changes warning on close attempt

### 4.2 Register New Service Form

**Current**: Good wizard-style layout, minor improvements needed

**Enhancements**:
- [ ] Add step indicator for multi-step registration
- [ ] Improve "Required" badge positioning (inside field label)
- [ ] Add field-level help tooltips
- [ ] Show path preview as user types name
- [ ] Add URL validation with connectivity test button
- [ ] Implement "Save as Draft" functionality

### 4.3 JWT Token Modal

**Current Issues**:
- Token displayed in plain text (security concern for screen sharing)
- JSON hard to read
- No expiration indicator

**Proposed Improvements**:
```
┌─────────────────────────────────────────────────────────────────┐
│ JWT Access Token                                          [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ⚠️  Keep this token secure. Do not share or commit to code.   │
│                                                                 │
│  Token: ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●  [👁 Show] [📋 Copy]   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Expires in: 7h 59m 45s                    ━━━━━━━━━━○   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Token Details                                      [Expand ▾]  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Scope: mcp-registry-admin                                │   │
│  │ Realm: mcp-gateway                                       │   │
│  │ Client: user-generated                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Copy JSON]  [Download JSON]  [Copy Token Only]                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Deliverables**:
- [ ] Hide token by default with reveal toggle
- [ ] Add visual expiration countdown with progress bar
- [ ] Collapse full JSON by default
- [ ] Add "Copy Token Only" button (just the access_token value)
- [ ] Add security warning banner

### 4.4 MCP Configuration Modal

**Current**: Good implementation, minor enhancements

**Enhancements**:
- [ ] Add line numbers to code block
- [ ] Add syntax highlighting theme toggle (match IDE preference)
- [ ] Add "Test Connection" button
- [ ] Show server health status in modal
- [ ] Add IDE-specific installation instructions link

### 4.5 Modal Component Standardization

Create consistent modal patterns:
- [ ] Standard header with title and close button
- [ ] Consistent footer with Cancel (left) and Primary action (right)
- [ ] Keyboard support (Escape to close, Tab navigation)
- [ ] Focus trap within modal
- [ ] Backdrop click to close (with unsaved changes warning)
- [ ] Loading states for async actions

---

## Phase 5: Enterprise Features

**Goal**: Add features critical for enterprise deployment and governance.

### 5.1 Audit Trail Visibility

**New Feature**: Show who registered/modified servers and when

**Card Enhancement**:
```
│ Registered by: john.doe@company.com on Jan 15, 2026           │
│ Last modified: jane.smith@company.com on Jan 20, 2026         │
```

**Dedicated Audit Log Page** (Admin only):
- [ ] Create `/audit` route
- [ ] Table view of all actions (register, enable, disable, edit, delete)
- [ ] Filter by user, action type, date range
- [ ] Export audit log as CSV

### 5.2 Server Grouping & Folders

**New Feature**: Organize servers by team/department/environment

```
GROUPS
├── 📁 Production (12)
│   ├── 📁 Core Services (5)
│   └── 📁 Integrations (7)
├── 📁 Staging (4)
└── 📁 Development (6)
```

**Deliverables**:
- [ ] Create group management UI
- [ ] Drag-and-drop server assignment
- [ ] Group-level enable/disable
- [ ] Group-level health summary

### 5.3 Advanced Search & Saved Searches

**Enhancements to Search**:
- [ ] Search scope dropdown (name, description, tags, tools)
- [ ] Search history (recent searches)
- [ ] Save search as filter preset
- [ ] Share search URL

### 5.4 RBAC-Aware UI

**Enhance UI to reflect permissions**:
- [ ] Show "View Only" badge for non-admin users
- [ ] Disable edit buttons when user lacks permission
- [ ] Show permission level in user dropdown
- [ ] Add "Request Access" flow for restricted servers

### 5.5 Notifications & Alerts

**New Feature**: Health degradation alerts

- [ ] Bell icon in header with notification dropdown
- [ ] Real-time health change notifications
- [ ] Email/webhook notification preferences in Settings
- [ ] Notification history page

---

## Phase 6: Accessibility & Polish

**Goal**: Ensure WCAG AA compliance and professional polish.

### 6.1 Keyboard Navigation

**Requirements**:
- [ ] All interactive elements focusable with Tab
- [ ] Visible focus indicators (not just outline)
- [ ] Escape closes modals
- [ ] Arrow keys navigate within menus
- [ ] Enter/Space activates buttons
- [ ] Cmd+K opens global search

**Implementation**:
- [ ] Audit all components for keyboard support
- [ ] Add `tabindex` where needed
- [ ] Implement focus management for modals
- [ ] Add skip links for screen readers

### 6.2 ARIA Labels & Screen Reader Support

**Requirements**:
- [ ] All icon-only buttons have `aria-label`
- [ ] Form fields have associated labels
- [ ] Dynamic content changes announced
- [ ] Landmarks for main regions (header, nav, main, aside)

**Implementation**:
- [ ] Audit with axe DevTools
- [ ] Add `aria-live` regions for dynamic updates
- [ ] Test with VoiceOver/NVDA

### 6.3 Color Contrast & Visual Accessibility

**Requirements**:
- [ ] All text meets WCAG AA contrast ratio (4.5:1 normal, 3:1 large)
- [ ] Don't rely solely on color (add icons/patterns)
- [ ] Support reduced motion preference
- [ ] Support high contrast mode

**Implementation**:
- [ ] Run contrast checker on all color combinations
- [ ] Add `prefers-reduced-motion` media query support
- [ ] Test with color blindness simulators

### 6.4 Performance Optimizations

- [ ] Virtualize long lists (react-virtual)
- [ ] Lazy load images and icons
- [ ] Optimize bundle size (already using code splitting)
- [ ] Add loading skeletons for async content

### 6.5 Error States & Empty States

**Standardize across app**:
- [ ] Create `EmptyState.tsx` component
- [ ] Create `ErrorState.tsx` component
- [ ] Add retry buttons for failed requests
- [ ] Friendly error messages (not raw API errors)

---

## Phase 7: Settings & Preferences (Phase 2 Scope)

**Goal**: User customization and organization settings.

### 7.1 Theme Customization

- [ ] Light/Dark/System theme toggle (exists)
- [ ] Custom accent color picker
- [ ] Organization-branded themes
- [ ] Persist preference across devices (via backend)

### 7.2 Settings Page Improvements

**Current Issues**:
- Version number in dropdown is odd placement
- "N/A" for email looks incomplete
- Permissions section could show more detail

**Enhancements**:
- [ ] Move version to footer
- [ ] Show email from identity provider or indicate "Not provided"
- [ ] Expand permissions to show all granted scopes
- [ ] Add notification preferences section
- [ ] Add data export/privacy section

---

## Implementation Sequence

### Recommended Execution Order

```
Week 1-2: Foundation (Phase 1)
├── Design tokens & color palette
├── Typography & spacing system
└── Aceternity UI Pro setup

Week 3-4: Layout (Phase 2)
├── Header consolidation
├── Sidebar redesign
└── Tab navigation

Week 5-7: Dashboard (Phase 3)
├── Card redesign
├── Health status system
├── Bulk actions
└── Sorting & views

Week 8-9: Forms (Phase 4)
├── Modal standardization
├── Edit server form
├── Registration form
└── JWT token modal

Week 10-12: Enterprise (Phase 5)
├── Audit trail
├── Grouping system
├── Advanced search
└── Notifications

Week 13-14: Accessibility (Phase 6)
├── Keyboard navigation
├── Screen reader support
├── Contrast fixes
└── Performance

Week 15+: Polish (Phase 7)
├── Theme customization
├── Settings enhancements
└── Final QA
```

---

## Technical Considerations

### Dependencies to Add

**Aceternity UI Pro Core Dependencies**:
```json
{
  "dependencies": {
    "framer-motion": "^12.0.0-alpha.1",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-dialog": "^1.x",
    "@radix-ui/react-dropdown-menu": "^2.x",
    "@radix-ui/react-select": "^2.x",
    "@radix-ui/react-tooltip": "^1.x",
    "@radix-ui/react-checkbox": "^1.x",
    "@tabler/icons-react": "^3.5.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0",
    "react-wrap-balancer": "^1.1.0",
    "react-hook-form": "^7.x",
    "@hookform/resolvers": "^3.x",
    "zod": "^3.x",
    "@tanstack/react-virtual": "^3.x"
  },
  "devDependencies": {
    "@axe-core/react": "^4.x"
  }
}
```

**Note**: Replace `@heroicons/react` with `@tabler/icons-react` for consistency with Aceternity UI Pro.

**Tailwind Config Additions** (from Aceternity template):
```javascript
// Add to tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        scroll: "scroll var(--animation-duration, 40s) var(--animation-direction, forwards) linear infinite",
        "fade-in": "fade-in 0.5s ease-in-out forwards",
        marquee: "marquee var(--duration) linear infinite",
        "marquee-vertical": "marquee-vertical var(--duration) linear infinite",
      },
      keyframes: {
        scroll: {
          to: { transform: "translate(calc(-50% - 0.5rem))" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        "marquee-vertical": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(calc(-100% - var(--gap)))" },
        },
      },
      boxShadow: {
        derek: "0px 0px 0px 1px rgba(0,0,0,.06),0px 1px 1px -0.5px rgba(0,0,0,.06),0px 3px 3px -1.5px rgba(0,0,0,.06),0px 6px 6px -3px rgba(0,0,0,.06),0px 12px 12px -6px rgba(0,0,0,.06),0px 24px 24px -12px rgba(0,0,0,.06)",
        aceternity: "0px 2px 3px -1px rgba(0,0,0,0.1), 0px 1px 0px 0px rgba(25,28,33,0.02), 0px 0px 0px 1px rgba(25,28,33,0.08)",
      },
    },
  },
};
```

### File Structure Changes

```
frontend/src/
├── components/
│   ├── ui/                    # Aceternity UI Pro components (ported)
│   │   ├── button.tsx         # 3 variants: simple, outline, primary
│   │   ├── badge.tsx          # Animated badge with gradient
│   │   ├── switch.tsx         # Framer Motion toggle
│   │   ├── card.tsx           # Adapted from GridFeatures
│   │   ├── dialog.tsx         # Radix UI dialog wrapper
│   │   ├── dropdown-menu.tsx  # Radix UI dropdown
│   │   ├── label.tsx          # Form labels
│   │   ├── form.tsx           # react-hook-form integration
│   │   ├── animated-tooltip.tsx # Hover tooltips
│   │   ├── mode-toggle.tsx    # Theme switcher (adapted)
│   │   ├── container.tsx      # Max-width wrapper
│   │   ├── heading.tsx        # Typography variants
│   │   ├── subheading.tsx     # Secondary typography
│   │   ├── in-view-div.tsx    # Scroll animation wrapper
│   │   └── skeleton.tsx       # Loading states
│   ├── layout/
│   │   ├── Header.tsx         # Redesigned with Aceternity NavBar pattern
│   │   ├── Sidebar.tsx        # Redesigned
│   │   ├── Layout.tsx
│   │   └── MobileNav.tsx      # New - responsive navigation
│   ├── dashboard/
│   │   ├── ServerCard.tsx     # Redesigned with GridFeatures hover
│   │   ├── AgentCard.tsx      # Redesigned with GridFeatures hover
│   │   ├── BulkActionsBar.tsx # New
│   │   ├── HealthBadge.tsx    # New - using Aceternity Badge
│   │   └── SortDropdown.tsx   # New
│   ├── forms/
│   │   ├── EditServerModal.tsx # Using Aceternity Form + Dialog
│   │   ├── RegisterForm.tsx    # Using Aceternity Form
│   │   └── ...
│   └── common/
│       ├── EmptyState.tsx     # New
│       ├── ErrorState.tsx     # New
│       └── GridBackground.tsx # From Aceternity grid-lines
├── styles/
│   ├── design-tokens.css      # New
│   └── globals.css
└── lib/
    └── utils.ts               # cn() utility (clsx + tailwind-merge)
```

### Component Migration Mapping

| Current Component | Aceternity Replacement | Notes |
|-------------------|------------------------|-------|
| `<button>` elements | `Button` (3 variants) | Use primary for CTAs |
| Headless UI Switch | `Switch` (Framer Motion) | Smoother animation |
| Status dots | `Badge` | Add gradient animation |
| `Layout.tsx` | `Container` + `NavBar` pattern | Responsive wrapper |
| Page titles | `Heading` with size props | Balanced text wrapping |
| Heroicons | Tabler Icons | Full icon replacement |
| Tailwind hover states | `InViewDiv` + Framer Motion | Scroll-triggered animations |
| CSS transitions | Framer Motion | Consistent animation library |

### API Changes Required

| Endpoint | Change | Purpose |
|----------|--------|---------|
| `GET /api/servers` | Add `sort`, `order` params | Sorting support |
| `POST /api/servers/bulk` | New endpoint | Bulk enable/disable |
| `GET /api/audit` | New endpoint | Audit log |
| `GET /api/groups` | New endpoint | Server grouping |
| `POST /api/favorites` | New endpoint | User favorites |

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Lighthouse Accessibility | TBD | 95+ |
| Lighthouse Performance | TBD | 90+ |
| Time to find server | TBD | < 5 seconds |
| Bulk action completion | N/A | < 3 clicks |
| Mobile responsiveness | Partial | Full support |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing workflows | High | Incremental rollout, feature flags |
| Aceternity Next.js → Vite migration | Medium | Port components one at a time, test thoroughly |
| Framer Motion bundle size | Medium | Tree-shake unused features, code-split animations |
| Icon library swap (Heroicons → Tabler) | Low | Find-replace with mapping table, visual QA |
| Accessibility regressions | High | Automated testing in CI with axe-core |
| Performance degradation | Medium | Bundle analysis, lazy loading, Lighthouse CI |

---

## Appendix: Component Inventory

### Components to Create

1. `HealthBadge` - Three-state health indicator
2. `BulkActionsBar` - Selection actions toolbar
3. `SortDropdown` - Sort options with direction toggle
4. `TagInput` - Tag entry with autocomplete
5. `EmptyState` - Consistent empty state display
6. `ErrorState` - Consistent error display
7. `LoadingSkeleton` - Content placeholder
8. `QuickSearch` - Sidebar search widget
9. `FavoriteButton` - Star/unstar toggle
10. `AuditLogTable` - Audit trail display

### Components to Redesign

1. `ServerCard` - Full card redesign
2. `AgentCard` - Full card redesign
3. `Sidebar` - New layout and sections
4. `Header` - Consolidated navigation
5. `EditServerModal` - Form improvements
6. `JWTTokenModal` - Security improvements
7. `SettingsPage` - Section enhancements

---

## Next Steps

1. **Review & Approve** this plan
2. **Prioritize** if any phases should be reordered
3. **Create GitHub issues** for each phase/deliverable
4. **Begin Phase 1** with design token setup

---

## Appendix B: Aceternity UI Pro Migration Guide

### Source Template Location
```
.archive/ai-saas-template/
├── components/           # UI components to port
│   ├── ui/              # Core UI primitives
│   ├── navbar/          # Navigation components
│   ├── skeletons/       # Loading state components
│   └── *.tsx            # Feature components
├── lib/
│   └── utils.ts         # cn() utility function
└── tailwind.config.ts   # Animation/shadow config
```

### Migration Checklist

**Phase 1.2.1 - Foundation Setup**:
- [ ] Install Aceternity dependencies (framer-motion, @tabler/icons-react, etc.)
- [ ] Copy `lib/utils.ts` to `frontend/src/lib/utils.ts`
- [ ] Update `frontend/tailwind.config.js` with Aceternity animations/shadows
- [ ] Configure Vite path aliases to match `@/` imports

**Phase 1.2.2 - Core Components**:
- [ ] Port `Button` component (remove "use client", update imports)
- [ ] Port `Badge` component
- [ ] Port `Switch` component
- [ ] Port `Container` component
- [ ] Port `Heading` and `Subheading` components
- [ ] Port `Label` and `Form` components (adapt for react-hook-form)

**Phase 1.2.3 - Animation Components**:
- [ ] Port `InViewDiv` component
- [ ] Port `AnimatedTooltip` component
- [ ] Port `ModeToggle` (replace next-themes with custom context)

**Phase 1.2.4 - Feature Components**:
- [ ] Adapt `GridFeatures` pattern for ServerCard/AgentCard
- [ ] Port `Skeleton` components for loading states
- [ ] Port `GridLines` for background decoration

### Code Transformation Examples

**Before (Next.js)**:
```tsx
"use client";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
```

**After (Vite/React Router)**:
```tsx
import { useTheme } from "@/hooks/useTheme"; // Custom hook
import { Link } from "react-router-dom";
// Use standard <img> or Vite image plugins
```

**Theme Provider Setup (Vite)**:
```tsx
// frontend/src/context/ThemeContext.tsx
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({ theme: "dark", setTheme: () => {} });

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      : theme
    );
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
```

### Icon Migration Reference

| Heroicon | Tabler Icon Equivalent |
|----------|------------------------|
| `PlusIcon` | `IconPlus` |
| `XMarkIcon` | `IconX` |
| `CheckIcon` | `IconCheck` |
| `ChevronDownIcon` | `IconChevronDown` |
| `MagnifyingGlassIcon` | `IconSearch` |
| `Cog6ToothIcon` | `IconSettings` |
| `ArrowPathIcon` | `IconRefresh` |
| `TrashIcon` | `IconTrash` |
| `PencilIcon` | `IconPencil` |
| `ClipboardDocumentIcon` | `IconClipboard` |
| `ServerIcon` | `IconServer` |
| `UserCircleIcon` | `IconUserCircle` |
| `SunIcon` | `IconSunLow` |
| `MoonIcon` | `IconMoon` |

Import change:
```tsx
// Before
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

// After
import { IconPlus, IconX } from "@tabler/icons-react";
```

---

*Plan Author: Claude AI Assistant*
*Review Status: Pending*
*Last Updated: 2026-01-25 (Aceternity UI Pro integration)*
