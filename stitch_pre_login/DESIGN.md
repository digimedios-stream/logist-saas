---
name: Aetheric Logistics
colors:
  surface: '#131314'
  surface-dim: '#131314'
  surface-bright: '#3a393a'
  surface-container-lowest: '#0e0e0f'
  surface-container-low: '#1c1b1c'
  surface-container: '#201f20'
  surface-container-high: '#2a2a2b'
  surface-container-highest: '#353435'
  on-surface: '#e5e2e2'
  on-surface-variant: '#c6c6cc'
  inverse-surface: '#e5e2e2'
  inverse-on-surface: '#313031'
  outline: '#909096'
  outline-variant: '#46464c'
  surface-tint: '#c3c6d4'
  primary: '#c3c6d4'
  on-primary: '#2c303b'
  primary-container: '#0b0f19'
  on-primary-container: '#787b88'
  inverse-primary: '#5a5e6a'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#4cd7f6'
  on-tertiary: '#003640'
  tertiary-container: '#001217'
  on-tertiary-container: '#00889f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dfe2f1'
  primary-fixed-dim: '#c3c6d4'
  on-primary-fixed: '#171b26'
  on-primary-fixed-variant: '#434652'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#acedff'
  tertiary-fixed-dim: '#4cd7f6'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5c'
  background: '#131314'
  on-background: '#e5e2e2'
  surface-variant: '#353435'
typography:
  headline-xl:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-md:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-display:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0.05em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-edge: 32px
  panel-padding: 24px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is engineered for the high-stakes world of enterprise logistics and global movement. It projects a personality of **precision, foresight, and technological dominance**. The target audience—operations directors and data analysts—requires a UI that feels like a mission control center: authoritative yet hyper-efficient.

The visual style is **Futuristic Glassmorphism**. This aesthetic utilizes deep-space backgrounds, translucent surfaces with heavy backdrop blurs, and luminous accents to imply a multi-layered data environment. By mixing elements of **Corporate Modern** structure with **Glassmorphic** depth and **Cyberpunk** lighting, the design system creates a sense of "physical data" that feels tangible and premium.

Key visual pillars:
- **Optical Depth:** Layers are separated by varied blur intensities and subtle inner glows rather than traditional shadows.
- **Luminance:** Borders and active states "emit" light, mimicking the glow of a high-end command console.
- **Kinetic Energy:** The use of gradients and diagonals (inspired by the logo's arrow) suggests constant forward motion.

## Colors

This design system uses a **Deep Slate Blue** foundation to provide maximum contrast for its glowing accents. 

- **Deep Slate Blue (#0B0F19):** Used for the primary background. It reduces eye strain during extended monitoring sessions.
- **Logistic Emerald (#10B981):** Represents "Active," "Optimal," and "Success." It is the primary action color.
- **Neon Cyan (#06B6D4):** Dedicated to connectivity, GPS telemetry, and real-time movement updates.
- **Electric Violet (#8B5CF6):** Reserved for complex analytics, machine learning insights, and predictive modeling.

**Glass Application:**
Surface colors should rarely be solid. Use `rgba(15, 23, 42, 0.7)` with a `backdrop-filter: blur(20px)` to create the signature glass effect. Ensure a 1px inner border of `rgba(255, 255, 255, 0.1)` is applied to all glass panels to define their edges against the dark background.

## Typography

The typography strategy balances high-end branding with technical utility.

- **Outfit:** Selected for all primary UI text and headlines. Its geometric construction mirrors the modern, forward-moving nature of the brand. Headlines should use tighter letter spacing to maintain a "locked-in" professional feel.
- **JetBrains Mono:** Used for all "Hard Data." This includes GPS coordinates, timestamps, VIN numbers, and financial metrics. The monospaced nature ensures that numbers don't jump horizontally when values update in real-time.

**Formatting Rules:**
- Titles should use `text-primary` (Off-white).
- Secondary labels and helper text should use `text-secondary` (Slate Gray).
- Use `label-caps` for table headers and section overviews to create a disciplined, military-grade hierarchy.

## Layout & Spacing

The design system employs a **12-column Fluid Grid** with fixed maximum widths for ultra-wide monitors (common in logistics hubs). 

- **Spacing Rhythm:** Based on a 4px baseline, but defaults to a 16px/24px rhythm for core components to maintain a clean, airy "Enterprise" feel.
- **Breakpoints:**
  - **Desktop (1440px+):** 12 columns, 24px gutters, 32px side margins.
  - **Tablet (768px - 1439px):** 8 columns, 16px gutters, 24px side margins.
  - **Mobile (<767px):** 4 columns, 12px gutters, 16px side margins.

**Special Layout Rule:** 
"Floating Dashboards." Unlike traditional SaaS, panels should not always touch. Use `stack-lg` (32px) spacing between major glass modules to allow the background gradients or maps to peak through, enhancing the sense of depth.

## Elevation & Depth

In this design system, depth is communicated through **Translucency and Chrome-like Luminescence** rather than traditional drop shadows.

- **Level 1 (Base):** Deep Slate Blue background (#0B0F19).
- **Level 2 (Panels):** Glass surfaces with 70% opacity and 20px backdrop blur. 
- **Level 3 (Floating Components):** Higher opacity (85%) and a subtle "Glow Shadow." Instead of black, use a diffused shadow colored with the primary accent (e.g., a soft cyan outer glow) to simulate light reflecting off a surface.
- **Borders:** All panels must have a 1px border. 
  - Standard: `rgba(255, 255, 255, 0.1)`
  - Active/Hover: Gradient border transitioning from `Neon Cyan` to `Electric Violet`.

## Shapes

The shape language is **Technological Rounded**. It avoids the "bubbly" look of consumer apps by using precise, moderate corner radii.

- **Containers/Panels:** 1rem (16px) roundedness to soften the large enterprise data sets.
- **Buttons/Inputs:** 0.5rem (8px) roundedness for a focused, modular feel.
- **Status Pills:** Fully rounded (pill-shaped) to distinguish them from interactive buttons.

The geometry should feel "machined." All corners should be consistent across a single panel to maintain the illusion of a solid piece of glass.

## Components

### Buttons
- **Primary:** Gradient background (Cyan to Emerald), white text, 8px radius. On hover, add a `0 0 15px` glow of the primary color.
- **Secondary:** Glass background, 1px white-translucent border, white text.
- **Ghost:** No background, cyan text, icon-only or text-only.

### Input Fields
- Dark background (darker than the panel it sits on).
- 1px border `rgba(255, 255, 255, 0.1)`. 
- Focus state: Border turns `Neon Cyan` with a 2px outer glow.
- Monospace font for numerical inputs.

### Cards (The "Data Pod")
- Use the Glassmorphism effect.
- Top-right corner should often feature a "Metric Label" in `JetBrains Mono`.
- Use 3D transforms on hover (scale 1.02, tilt 1deg) to emphasize the "floating" nature.

### Status Chips
- **Success:** Emerald text, emerald 10% opacity background, emerald 1px border.
- **Warning/Transit:** Cyan text, cyan 10% opacity background, cyan 1px border.
- **Critical:** Electric Violet text, violet 10% opacity background, violet 1px border.

### GPS & Telemetry Lists
- Use high-contrast zebra-striping with translucent fills.
- Every coordinate or ID must be rendered in `JetBrains Mono` for vertical alignment across rows.