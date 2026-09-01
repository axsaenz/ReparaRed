---
name: Warm Guardianship
colors:
  surface: '#faf9fd'
  surface-dim: '#dad9dd'
  surface-bright: '#faf9fd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f7'
  surface-container: '#efedf1'
  surface-container-high: '#e9e7eb'
  surface-container-highest: '#e3e2e6'
  on-surface: '#1a1c1e'
  on-surface-variant: '#43474e'
  inverse-surface: '#2f3033'
  inverse-on-surface: '#f1f0f4'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#455f88'
  primary: '#002045'
  on-primary: '#ffffff'
  primary-container: '#1a365d'
  on-primary-container: '#86a0cd'
  inverse-primary: '#adc7f7'
  secondary: '#904d00'
  on-secondary: '#ffffff'
  secondary-container: '#fe932c'
  on-secondary-container: '#663500'
  tertiary: '#321b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#4f2e00'
  on-tertiary-container: '#c6955e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#adc7f7'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#2d476f'
  secondary-fixed: '#ffdcc3'
  secondary-fixed-dim: '#ffb77d'
  on-secondary-fixed: '#2f1500'
  on-secondary-fixed-variant: '#6e3900'
  tertiary-fixed: '#ffddba'
  tertiary-fixed-dim: '#f2bc82'
  on-tertiary-fixed: '#2b1700'
  on-tertiary-fixed-variant: '#633f0f'
  background: '#faf9fd'
  on-background: '#1a1c1e'
  surface-variant: '#e3e2e6'
  surface-warm: '#FAF9F6'
  surface-cream: '#FDFCFB'
  terracotta-accent: '#C2410C'
  trust-blue-deep: '#0F172A'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.25'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.02em
  button:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 64px
  xl: 104px
  gutter: 24px
  margin-mobile: 24px
---

## Brand & Style

The design system is centered on **Professional Warmth**, shifting from a purely functional tool to an empathetic partner. It targets users who may be in stressful situations (home repairs, urgent service needs) and aims to evoke an immediate sense of relief, safety, and being "in good hands." 

The design style is a blend of **Modern Softness** and **Corporate Reliability**. It utilizes generous whitespace to reduce cognitive load and a refined tactile quality to feel premium yet accessible. By softening the edges and warming the palette, the UI moves away from "institutional" and toward "human-centric," ensuring that every interaction feels supportive and intentional.

## Colors

This design system replaces stark whites and cold grays with a foundation of warmth. The palette is designed to feel high-end and stable, utilizing low-vibrancy tones that are easy on the eyes.

- **Primary (Trust Blue):** A sophisticated, deep navy used for core branding, primary navigation, and headers. It represents the "Reliability" pillar.
- **Secondary (Terracotta/Warm Orange):** An inviting, earthy accent used for calls-to-action. It provides a human, energetic contrast to the deep blue.
- **Neutral (Warm Grey/Cream):** The background uses a soft cream (`#FAF9F6`) instead of pure white to eliminate glare and create a welcoming "paper-like" canvas.
- **Status Colors:** Use softened versions of standard semantic colors (e.g., sage green for success, dusty rose for errors) to maintain the empathetic tone.

## Typography

The design system utilizes **Plus Jakarta Sans** for all roles to achieve an approachable yet professional character. Its open apertures and soft curves improve readability and lend a modern, friendly air to the interface.

Line heights have been intentionally increased (1.6 for body text) to provide more breathing room and enhance the sense of calm. For headlines, a tighter letter-spacing is applied to maintain a sense of authority and strength, ensuring that while the brand is "warm," it remains "expert."

## Layout & Spacing

The layout philosophy emphasizes **spatial abundance**. By increasing margins and section padding, the design system avoids a cluttered "utility-only" look in favor of a curated, high-end experience.

- **Grid:** A 12-column fixed grid for desktop (max-width 1200px) and a 4-column fluid grid for mobile.
- **Sectioning:** Major sections on the page are separated by `xl` (104px) or `lg` (64px) spacing to allow users to digest information in manageable "chunks."
- **Internal Padding:** Components like cards and modals use generous internal padding (min 32px on desktop) to ensure content never feels cramped against the container edges.

## Elevation & Depth

This design system moves away from flat boxes and rigid borders, using **Ambient Shadows** and **Tonal Layers** to create a sense of premium depth.

- **Shadow Character:** Shadows are extra-diffused and low-opacity, using a slight tint of the primary blue (e.g., `rgba(26, 54, 93, 0.08)`) rather than pure black. This keeps the depth feeling soft and natural.
- **Surface Tiering:** 
    - **Base:** The warm cream background (`#FAF9F6`).
    - **Floating Layer:** Cards and containers use a pure white surface with a very soft shadow to "lift" them off the cream base.
    - **Interactive Layer:** On hover, elements slightly increase their shadow spread and lift, providing tactile feedback that feels "squishy" and responsive rather than mechanical.
- **Glassmorphism (Optional):** Used sparingly for navigation overlays or modals to maintain a sense of context and airiness.

## Shapes

The shape language is **Rounded**, utilizing a base radius of 0.5rem (8px). This creates a friendlier, softer visual rhythm that aligns with the "caring" brand personality.

- **Small Components (Inputs, Chips):** 0.5rem (8px).
- **Medium Components (Buttons, Small Cards):** 1rem (16px).
- **Large Components (Main Containers, Modals):** 1.5rem (24px).

Full pill shapes are encouraged for buttons and tags to maximize the "soft" feel and make interactive elements feel distinct from content containers.

## Components

### Buttons
Primary buttons use the Terracotta accent with a pill-shaped geometry. Secondary buttons use the Trust Blue with a ghost or subtle-fill style. Padding is generous (16px 32px) to make targets easy to hit and feel substantial.

### Cards
Cards are the primary content vehicle. They should feature a pure white background against the cream page surface, using a 16px or 24px corner radius. Borders are avoided in favor of the soft ambient shadows defined in Elevation.

### Input Fields
Inputs use a subtle warm-grey fill (`#F3F4F6`) with a 0.5rem corner radius. On focus, they transition to a white background with a 2px Trust Blue border and a soft glow, signaling clarity and readiness.

### Chips & Labels
Used for status and categories. These should use high-radius (pill) shapes and low-contrast, tinted backgrounds (e.g., a very soft blue background with deep blue text) to avoid visual noise.

### Feedback Elements
Modals and alerts should use the largest corner radius (24px) and be centered with significant backdrop blurring to keep the user's focus on the "caring" support being provided.