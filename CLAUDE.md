# VidBreefy — YouTube Video Summary Tool

## Your Task: Full Redesign of All Pages (UX + Visual)

Keep the SAME color palette but restructure and redesign ALL pages for premium UX.

## Color Palette (DO NOT CHANGE — use these exact values)
- Primary teal: `#14B8A6`
- Primary hover: `#0d9488`
- Dark navy sidebar: `#0f172a`
- Dark body bg: `#1e293b`
- Light bg: `#f8fafc`
- Text primary: `#0f172a`
- Text secondary: `#64748b`
- Text muted: `#6b8a7a`
- Text white: `#ffffff`
- Success: `#22c55e`
- Error: `#ef4444`
- Blue accent: `#60a5fa`
- Border light: `rgba(20, 184, 166, 0.2)`

## Design System Rules
1. CSS design system with CSS variables (NO Tailwind utility classes)
2. Space Grotesk for headings, Inter for body (Google Fonts)
3. SVG icons ONLY in UI — no emoji
4. Scroll reveal animations via .reveal class (IntersectionObserver)
5. Hover transforms on all interactive elements
6. Premium cards: layered shadows, smooth border-radius, hover lift effects
7. All buttons: smooth transitions (0.2s ease)

## Public Pages to Redesign
1. **LandingPage.jsx/css** — Hero + features + how-it-works + pricing preview + CTA. Premium landing feel.
2. **SummarizePage.jsx/css** — Video URL input + format selector + results display. Clean, focused UX.
3. **SummaryPage.jsx/css** — Summary output with format tabs (TL;DR, Short, Detailed, Key Points). Beautiful output.
4. **LoginPage.jsx/css** + **RegisterPage.jsx/css** + **ForgotPasswordPage.jsx/css** + **ResetPasswordPage.jsx/css** — Unified auth design.
5. **Navbar.jsx/css** — Teal-accented navbar, responsive, clean.
6. **Footer.jsx/css** — Clean footer with links.

## Admin Dashboard Redesign (CRITICAL)
Dark navy sidebar (#0f172a) with SVG icons, clean white content area:

7. **AdminPage.css** — Dashboard shell: sidebar + content layout
8. **UsersListPage.jsx/css** — User management table with search/filter
9. **UserDetailPage.jsx/css** — User detail with tabbed history
10. **AIModelsPage.jsx/css** — AI models CRUD with status indicators
11. **ContentPage.jsx/css** — Landing page content editor
12. **PricingPage.jsx/css** — Pricing tiers management
13. **PaymentsPage.jsx/css** — Payment/subscription management
14. **AuditLogPage.jsx/css** — Admin action log with filters
15. **TrashPage.jsx/css** — Soft-deleted items with restore
16. **SettingsPage.jsx/css** — System settings

## Pages to NOT touch (no redesign needed)
- DashboardPage.jsx/css (already fine)
- NotFoundPage.jsx/css (already fine)
- Toast, Modal, LoadingSpinner, Tooltip, Footer (reused components)

## Global CSS to Add
Add to App.css or create a globals.css:
```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');

:root {
  --color-primary: #14B8A6;
  --color-primary-hover: #0d9488;
  --color-bg-dark: #0f172a;
  --color-bg-body: #1e293b;
  --color-bg-light: #f8fafc;
  --color-text-primary: #0f172a;
  --color-text-secondary: #64748b;
  --color-text-muted: #6b8a7a;
  --color-text-white: #ffffff;
  --color-success: #22c55e;
  --color-error: #ef4444;
  --color-blue: #60a5fa;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.1);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
  --radius: 10px;
  --radius-lg: 16px;
  --transition: 0.2s ease;
}
```

Add scroll reveal JS to index.js or App.jsx:
```js
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); observer.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
```

## Build After Each Page
After each page redesign, run `npm run build` to verify no errors. Fix any issues before continuing.

## Notify on Completion
When completely done, run: openclaw system event --text "VidBreefy redesign complete" --mode now
