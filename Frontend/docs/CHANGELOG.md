# Changelog

This tracks notable changes to the frontend. Format is loosely based on Keep a Changelog. Dates use YYYY-MM-DD.

## [Unreleased]

### Added

**Marketing site**

- Navbar with scroll aware behavior: transparent at the top, hides on scroll down, reappears with a background on scroll up. Includes a mobile menu and smooth scroll links to homepage sections
- Hero section with animated headline, dashboard preview, and primary CTAs
- Features section, bento grid layout of product capabilities
- WhyChoose section with animated stat cards
- GetStarted section, step by step onboarding explainer with a desktop timeline layout and a simpler mobile layout
- Pricing section with plan comparison cards
- FAQ accordion
- CTA section with a cloudy background image, positioned before the footer
- Footer with sitewide links, hidden automatically on signup, login, and demo pages so those stay focused on the form

**Pages**

- `/signup`, full signup form for Pakistan, South Korea, and UAE, with country specific phone validation, password rules, and inline field errors
- `/login`, supports both password login and a two step OTP login flow
- `/demo`, demo booking form with a team or function selector built as a chip grid instead of native radio buttons
- `/docs`, documentation page with a sticky sidebar section jump on desktop and a horizontal scroller on mobile

**Frontend and backend integration**

- `src/lib/api.ts`, a single fetch wrapper every API call goes through, with a shared `ApiError` type that carries both a message and optional per field validation errors
- `src/lib/countries.ts`, shared country list (Pakistan, South Korea, UAE) used by both the signup and demo forms so they cannot drift out of sync
- `API_CONTRACT.md`, documents every endpoint the frontend currently expects, meant to be read by whoever builds the backend

**Design system**

- Exo 2 as the site font, loaded through `next/font/google`
- Indigo brand color (`#5B4FE9`) used consistently for primary actions across every page
- Light theme enforced regardless of the visitor's OS setting, `color-scheme: light` and a `suppressHydrationWarning` on the body to avoid a hydration mismatch caused by browser extensions
- Reusable `.shine-btn` hover animation for primary call to action buttons
- GSAP SplitText and ScrollTrigger used for section headings, split into characters and revealed with a skew and opacity animation scrubbed to scroll position

### Fixed

- Hydration warning caused by a browser extension injecting an attribute onto the `<body>` tag before React hydrates, resolved with `suppressHydrationWarning` scoped to just that element
- SplitText word wrapping bug where individual characters could break in the middle of a word, fixed by splitting into words and characters together instead of characters alone

### Infrastructure

- Frontend pushed to the shared repository under `Frontend/`, alongside the backend team's `Backend/` folder, merged into the `backend/setup` branch
