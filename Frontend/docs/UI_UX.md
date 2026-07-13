# UI and UX Guidelines

This documents the design system already in use on the frontend, so new pages and components stay consistent with what has been built.

## Typography

The site uses Exo 2 as the primary font, loaded through `next/font/google` in `src/app/layout.tsx`. It is a geometric, slightly technical looking font that fits an AI product without feeling cold.

Headings on marketing sections use a font weight of medium rather than bold, letting the size do the work instead of heavy weight. Body text sits around 14 to 16px with muted color rather than pure black, keeping paragraphs easy to read without competing with headings.

## Color

The brand color is indigo, `#5B4FE9`, used consistently for primary buttons, links, active states, and accents across every page. It does not vary between sections.

Backgrounds are white or very light gray (`bg-zinc-50`), never dark, the whole site commits to a light theme. Text uses a `foreground` CSS variable rather than hardcoded black, currently set to a very dark gray rather than pure black for softer contrast.

Semantic colors follow standard conventions: emerald for success and confirmed states, red for errors, amber for warnings or pending states.

## Spacing and shape

Cards and containers use fairly generous rounding, `rounded-2xl` or `rounded-3xl`, not sharp corners. Borders are subtle, `border-black/[.06]` to `border-black/[.1]`, rather than a solid dark border. Shadows are soft and colored toward indigo (`shadow-indigo-900/10`) rather than plain gray, which reads more premium on a light background.

## Layout

Every marketing section follows the same shape: a centered heading and subtitle at the top, capped at a readable max width, then the section's main content below. Sections are wrapped in a `max-w-6xl` or `max-w-3xl` container depending on how wide the content needs to be, and use consistent vertical padding (`py-20` on mobile, `py-28` on larger screens).

## Animation

Two animation systems are used together, each for a different job.

**Framer Motion** handles entrance animations, hover states, and any animation tied to component state (like an accordion opening or a form field showing an error). Most sections use a `whileInView` fade and slide up as the user scrolls to them, staggered slightly between child elements so they do not all appear at once.

**GSAP with SplitText and ScrollTrigger** handles section headings specifically. Headings are split into individual characters and revealed with a skew and opacity animation, scrubbed to scroll position rather than playing once on a timer. This is intentionally reserved for headings only, using it everywhere would be too busy.

Buttons that lead to a signup or purchase action (the primary CTA style) use a subtle shine sweep on hover, defined once in `globals.css` as the `.shine-btn` class and reused across the site rather than redefined per button.

## Components built so far

- `Navbar`: fixed position, hides on scroll down and reappears with a background on scroll up, transparent at the top of the page
- `Hero`: main landing headline, CTA buttons, and a dashboard preview card
- `Features`: bento grid layout showing product capabilities
- `WhyChoose`: stat cards with numbers that count up or reveal as the section scrolls into view
- `GetStarted`: step by step onboarding explainer
- `Pricing`: plan comparison cards
- `FAQ`: accordion
- `CTA`: final conversion section before the footer
- `Footer`: sitewide, hidden on focused conversion pages (signup, login, demo) so there is nothing to distract from finishing the form
- `SignupPage`, `LoginPage`, `DemoPage`: full page forms with inline validation and loading states
- `DocsPage`: documentation layout with a sticky section jump sidebar on desktop and a horizontal scroller on mobile

## Forms

Every form field shows its error directly beneath it, not in a separate summary block, so the user does not have to hunt for what went wrong. Submit buttons show a spinner and disable themselves while a request is in flight, and re-enable if it fails so the user can try again without reloading the page.

## Responsiveness

The site is built mobile first with Tailwind's breakpoint prefixes (`sm`, `lg`, `xl`) added as layouts need to change for larger screens, rather than designed for desktop and then squeezed down. Anything with a complex multi column desktop layout (the docs sidebar, the alternating timeline in `GetStarted`) has a distinct, simpler mobile layout rather than the same layout scaled down.

## Accessibility notes

- Icon only buttons (menu toggle, password visibility toggle, social icons in the footer) all have `aria-label`
- Radio style selectors built with buttons instead of native inputs (like the team selector on the demo page) use `role="radiogroup"` and `aria-checked` so they are still announced correctly
- Color is never the only signal for state, errors also show text, selected states also show a checkmark or bold weight
