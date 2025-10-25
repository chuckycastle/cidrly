# Theme System Documentation

cidrly includes a comprehensive theme detection and adaptation system that automatically adjusts colors based on your terminal's background color for optimal readability.

## Features

- **Automatic Theme Detection**: Detects whether your terminal uses a light or dark background
- **Multiple Detection Methods**: Uses OSC 11 queries, COLORFGBG env var, with smart fallbacks
- **Adaptive Color Palettes**: Optimized color schemes for both light and dark backgrounds
- **User Override**: Manual theme selection via CLI flags or programmatic API
- **Accessibility**: Respects NO_COLOR and FORCE_COLOR environment variables
- **React Integration**: Hooks for easy theme access in Ink components

## How It Works

The theme system uses a hierarchy of detection methods:

1. **OSC 11 Query** (Most Accurate)
   - Queries the terminal for actual background RGB values
   - Calculates luminance using WCAG 2.0 formula
   - Only works with terminals that support OSC 11

2. **COLORFGBG Environment Variable** (Widely Supported)
   - Reads `COLORFGBG` (format: "foreground;background")
   - Maps ANSI color indices to light/dark
   - Colors 0-6: dark, 7-15: light

3. **Safe Default**
   - Falls back to dark theme (most common for developer terminals)

## Quick Start

### Basic Usage in Components

```tsx
import { useTheme, useThemeColors } from '../hooks/useTheme';

function MyComponent() {
  // Get theme-aware colors
  const colors = useThemeColors();

  return <Text color={colors.primary}>This text adapts to your terminal's background!</Text>;
}
```

### Full Theme Access

```tsx
import { useTheme, useAsyncThemeDetection } from '../hooks/useTheme';

function MyComponent() {
  // Enable async detection for best accuracy
  useAsyncThemeDetection();

  const { mode, colors, setThemePreference, toggleTheme } = useTheme();

  return (
    <Box>
      <Text>Current theme: {mode}</Text>
      <Text color={colors.accent}>Accent color</Text>
      <Text color={colors.success}>Success message</Text>
    </Box>
  );
}
```

## Available Hooks

### `useThemeMode()`

Returns the current theme mode (`'light'` or `'dark'`)

```tsx
const mode = useThemeMode();
// mode: 'light' | 'dark'
```

### `useThemeColors()`

Returns theme-aware color palette

```tsx
const colors = useThemeColors();
// colors: ThemeColors with all color definitions
```

### `useTheme()`

Comprehensive hook with all theme state and actions

```tsx
const {
  mode, // 'light' | 'dark'
  preference, // 'light' | 'dark' | 'auto'
  detected, // Detected theme
  colors, // Color palette
  setThemePreference, // Change preference
  toggleTheme, // Toggle between light/dark
} = useTheme();
```

### `useAsyncThemeDetection()`

Performs async OSC 11 detection on mount

```tsx
// Call once at app root for best detection
useAsyncThemeDetection();
```

## Color Palettes

Both light and dark themes include:

### Base Colors

- `text` - Primary text color
- `textDim` - Secondary text color
- `muted` - Muted elements
- `subtle` - Tertiary elements
- `dim` - Background elements

### Accent Colors

- `accent` - Primary actions (blue)
- `success` - Success states (green)
- `warning` - Warnings (amber)
- `error` - Errors (red)
- `info` - Informational (indigo)

### Special States

- `highlight` - Selected/highlighted items
- `border` - Subtle borders

### Status Colors

- `calculated` - Calculated state
- `draft` - Draft state
- `empty` - Empty state

### Efficiency Colors

- `efficiencyHigh` - High efficiency (≥75%)
- `efficiencyMedium` - Medium efficiency (≥50%)
- `efficiencyLow` - Low efficiency (<50%)

## Environment Variables

### NO_COLOR

Disables color output entirely (https://no-color.org/)

```bash
NO_COLOR=1 cidrly
```

### FORCE_COLOR

Forces color output even in non-TTY environments

```bash
FORCE_COLOR=1 cidrly
```

### COLORFGBG

Set by many terminals to indicate foreground/background colors

```bash
# Dark terminal (white on black)
COLORFGBG=15;0

# Light terminal (black on white)
COLORFGBG=0;15
```

## Manual Theme Selection

### Via Store (Programmatic)

```tsx
import { useUIStore } from '../store/uiStore';

// Set explicit preference
useUIStore.getState().setThemePreference('light');
useUIStore.getState().setThemePreference('dark');
useUIStore.getState().setThemePreference('auto');

// Toggle between light/dark
useUIStore.getState().toggleTheme();
```

### Via CLI Flag (Future Enhancement)

```bash
# Planned feature
cidrly --theme light
cidrly --theme dark
cidrly --theme auto  # Default
```

## Testing

Run the theme detection tests:

```bash
npm test tests/unit/theme-detection.test.ts
```

## Demo

View the theme system in action:

```bash
npm run dev examples/theme-demo
```

## Migration from Legacy Colors

Old code using `colors` export:

```tsx
import { colors } from '../themes/colors';
<Text color={colors.accent}>Text</Text>;
```

New theme-aware code:

```tsx
import { useThemeColors } from '../hooks/useTheme';
const colors = useThemeColors();
<Text color={colors.accent}>Text</Text>; // Same API!
```

The `colors` export still works (defaults to dark theme) for backward compatibility.

## Technical Details

### Detection Algorithm

1. Check `NO_COLOR` - if set, disable colors and use dark theme
2. Check `FORCE_COLOR` - if set, enable colors
3. Try OSC 11 query with 100ms timeout
   - Parse RGB response
   - Calculate luminance
   - Determine light/dark
4. Fall back to `COLORFGBG` parsing
5. Default to `dark` theme

### Luminance Calculation

Uses WCAG 2.0 relative luminance formula:

- Convert RGB (0-255) to sRGB (0-1)
- Apply gamma correction
- Calculate: `L = 0.2126*R + 0.7152*G + 0.0722*B`
- Threshold: L > 0.5 = light, L ≤ 0.5 = dark

### COLORFGBG Mapping

Standard ANSI color mapping:

- 0 (Black) → Dark
- 1-6 (Colors) → Dark
- 7 (Light Gray) → Light
- 8-15 (Bright Colors) → Light

## Best Practices

1. **Use `useAsyncThemeDetection()` once** at your app root
2. **Use `useThemeColors()`** in components for theme-aware colors
3. **Test both themes** when designing UIs
4. **Respect user preferences** - don't force a theme
5. **Use semantic color names** (success, error) over raw colors

## Troubleshooting

### Colors not adapting?

- Check if `useAsyncThemeDetection()` is called
- Verify `COLORFGBG` environment variable: `echo $COLORFGBG`
- Try setting theme manually to test

### Wrong theme detected?

- Your terminal may not support OSC 11
- Check/set `COLORFGBG` manually
- Override with `setThemePreference()`

### No colors at all?

- Check for `NO_COLOR` environment variable
- Verify terminal supports colors
- Try `FORCE_COLOR=1`
