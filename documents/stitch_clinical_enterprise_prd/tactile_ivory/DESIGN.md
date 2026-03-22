# Alabaster Neumorph Design System

### 1. Overview & Creative North Star
**Creative North Star: The Tactile Archive**
Alabaster Neumorph moves away from the flat, "digital-only" aesthetic toward a tactile, physical-industrial interface. It reimagines the dashboard as a high-end editorial workspace where light and shadow perform the heavy lifting of information architecture. By utilizing soft, extruded surfaces and "pushed-in" containers, the system creates an environment that feels carved rather than rendered.

### 2. Colors
The palette is rooted in a warm, stone-like neutral (`#F2EFE9`) that provides a soft canvas for a high-intensity Primary Blue (`#4849da`).

- **The "No-Line" Rule:** 1px borders are strictly prohibited for structural separation. Use background color shifts (`surface-container-high`) or the signature Neumorphic dual-shadow (White Highlight / Dark Shadow) to define boundaries.
- **Surface Hierarchy & Nesting:** Depth is achieved through the transition from `surface-container-lowest` (pure white highlights) to `surface-dim`.
- **The Glass & Gradient Rule:** Navigation and sticky headers must use a 85% opacity backdrop blur (`#F2EFE9/85`) to maintain spatial context.
- **Signature Textures:** Primary CTAs use a linear gradient from `primary` to `primary-dim` to add visual weight and physical presence.

### 3. Typography
The system uses **Plus Jakarta Sans** across all levels, leaning into its modern geometric quirks and high readability.

- **Display & Headlines:** Large, extra-bold weights (1.875rem and 1.5rem) with tight tracking (-0.025em) provide an editorial, authoritative feel.
- **The "Data-Rich" Scale:** 
    - **Large Title:** 1.875rem (Extra Bold)
    - **Section Header:** 1.5rem (Bold)
    - **Subheader:** 1.25rem (Bold)
    - **Standard Body:** 0.875rem (Medium)
    - **Small Label:** 0.75rem (Semibold, Uppercase, Wide Tracking)
    - **Compact Meta:** 10px (Extra Bold, for tags and chips)

### 4. Elevation & Depth
Elevation is defined by light source simulation rather than Z-index stacking.

- **The Layering Principle:** 
    - **Flat (Base):** Standard surface.
    - **Lifted (Cards):** Dual shadow: `-6px -6px 12px rgba(255, 255, 255, 0.8)` (top-left light) and `8px 8px 16px rgba(72, 73, 218, 0.06)` (bottom-right ambient tint).
    - **Pressed (Inputs/Active):** Inset shadows: `inset 4px 4px 8px rgba(0, 0, 0, 0.05)` and `inset -4px -4px 8px rgba(255, 255, 255, 0.8)`.
- **Ambient Shadows:** For hover states, increase blur and spread (`12px 12px 24px`) to simulate a "lift" off the page.
- **Ghost Border Fallback:** Use `white/40` as a subtle hairline only when elements overlap complex backgrounds.

### 5. Components
- **Buttons:** Large, pill-shaped (radius: full). Primary buttons use gradients and `shadow-lg`. Secondary buttons use the `neumorphic-flat` style.
- **Chips:** Tiny (10px font), bold, and uppercase. Backgrounds should be low-chroma tonal spots (`secondary-container`).
- **Cards:** Defined by `1rem` to `2rem` border radius and the dual-shadow "lift."
- **Inputs:** Use the "Pressed" neomorphic style to indicate an area where data is "poured in."
- **Tables:** Use `border-separate` with `border-spacing-y-4` to create floating row islands. Row backgrounds should be semi-transparent (`white/30`).

### 6. Do's and Don'ts
- **Do** use large amounts of whitespace (Spacing 3) to allow shadows to breathe.
- **Do** use subtle animations (scale 95% on click) to reinforce the tactile nature.
- **Don't** use pure black for text; use `on-surface` (`#38382f`) to maintain the soft-contrast aesthetic.
- **Don't** use sharp corners; the minimum radius for any container is `1rem`.