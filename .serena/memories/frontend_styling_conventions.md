# Frontend Styling Conventions

## UI Component Library
- Uses **shadcn/ui** components built on Radix UI primitives
- Styling via **Tailwind CSS** utility classes
- Components located in `frontend/src/components/ui/`

## Dialog/Modal Components

### Base Dialog Component
Location: `frontend/src/components/ui/dialog.tsx`

**Important**: The base `DialogContent` component should NOT include responsive max-width classes like `sm:max-w-lg`. This allows individual modals to control their own width via the `className` prop.

The base styles include:
- `max-w-[calc(100%-2rem)]` - prevents overflow on small screens
- Animation classes for open/close transitions
- `glass-panel` custom class for styling

### Setting Modal Widths
When creating modals, set width on the `DialogContent` component:

```tsx
<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
```

Available Tailwind max-width classes:
- `max-w-sm` = 384px
- `max-w-md` = 448px
- `max-w-lg` = 512px
- `max-w-xl` = 576px
- `max-w-2xl` = 672px
- `max-w-3xl` = 768px
- `max-w-4xl` = 896px (recommended for form modals)
- `max-w-5xl` = 1024px
- `max-w-6xl` = 1152px

### CSS Specificity with Tailwind
**Issue**: Responsive prefixes (e.g., `sm:max-w-lg`) in base components will override non-prefixed classes (e.g., `max-w-4xl`) at larger screen sizes.

**Solution**: Either:
1. Don't use responsive prefixes in base components for properties meant to be overridden
2. Use matching responsive prefixes in consuming components (e.g., `sm:max-w-4xl`)

## Current Modal Widths
- `EditServerModal.tsx` - `max-w-4xl` (896px)
- `EditAgentModal.tsx` - `max-w-4xl` (896px)

## Hot Reload Development
- Frontend runs on `http://localhost:3000` via Vite
- Changes to `.tsx` files should hot-reload automatically
- If changes don't appear: check browser DevTools for the actual CSS being applied
