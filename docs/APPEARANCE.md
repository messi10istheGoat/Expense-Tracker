# Spendwise appearance system

## Experience

Style Studio is available from the workspace header and in Settings. The same component powers both surfaces, with independent native radio group names so an open modal cannot interfere with the Settings gallery. Style, color-mode preference, and reading size are independent controls; changes apply immediately, without a save step.

- **Minimal:** pure black, white, and grayscale. Monochrome chart palettes, icons, progress bars, and status surfaces; a black balance card in light mode.
- **Botanical:** preserves the original cream/forest-green identity and softer editorial moments.
- **Brutalist:** stronger outlines, square geometry, hard offset shadows, emphatic typography, yellow highlights.
- **Neon:** carbon black, electric lime, and soft neutral surfaces, inspired by the user-supplied Lumin banking reference. Black financial cards, lime accents, and restrained orbit details work in both modes.
- **Glassmorphism:** frosted blue/slate surfaces over an atmospheric mountain landscape, fine highlight edges, soft shadows, and yellow/peach/lavender/lime summary cards inspired by the user-supplied glass dashboard reference.

All five have a deliberately tuned light and dark palette, rather than an inverted screenshot. The gallery previews follow the current resolved mode. Device mode reacts to operating-system changes; an explicit choice overrides it. The header sun/moon button selects the opposite explicit mode while preserving the style.

## Readability and interaction

Body text is 15px normally and 17px in Larger mode; supporting type uses a 12–14px or 14–16px scale. Financial summaries, section headings, table labels, and form controls have distinct weights/sizes. Charts use 12px/14px labels and semantic CSS colors instead of hard-coded light-theme colors. Secondary text, financial status colors, tooltips, and hero cards each have their own roles.

The desktop sidebar/header, tablet grids, and mobile navigation share the same page components. Tables remain scrollable inside their containers rather than widening the document. Smaller screens stack actions and summary cards. Larger reading size is a preference, not a substitute for browser zoom.

Micro-interactions include selected-state checks, hover elevation, deliberate Brutalist button presses, subtle Neon highlights, animated progress changes, page/dialog/toast entrances, and financial values tweening after data changes. Initial values do not misleadingly start at zero. Screen readers receive the final financial value, not every animation frame. Reduced motion disables entrances/transitions and skips number tweening. Native dialogs and radio controls retain keyboard behavior, visible focus, and Escape handling.

## Architecture

`src/finance/spendwise.css` imports, in order:

1. `styles/tokens.css`: ten semantic palettes and type scales.
2. `styles/base.css`: bundled Inter, reset, typography, focus, screen-reader helpers.
3. `styles/layout.css`: workspace shell, navigation, header, responsive behavior.
4. `styles/components.css`: panels, buttons, forms, dialogs, toasts.
5. `styles/pages.css`: all ten financial sections and their responsive arrangements.
6. `styles/appearance.css`: gallery/miniature previews and style-specific material treatments.
7. `styles/analytics.css`: the dedicated report workspace, responsive controls, chart data tables, and analytical cards.
8. `styles/glass.css`: scoped frosted surfaces, the panoramic gallery preview, local scenic background, responsive blur, and solid-material fallbacks.
9. `styles/motion.css`: state feedback, hover/press behavior, reduced-motion overrides.

`appearance.ts` defines validated IDs, defaults, storage keys, and legacy migration. `useTheme.tsx` owns resolved mode, system preference changes, read-only cross-tab storage synchronization, DOM attributes, and browser theme color. Only local preference actions persist changes; incoming storage events are not echoed back, avoiding cross-tab write races. `index.html` applies matching preferences before React's first paint.

Preferences use `spendwise-style`, `spendwise-theme`, and `spendwise-text-size`. They are separate from `spendwise-workspace-v1`; switching appearance does not migrate, rewrite, or reset financial data. Old explicit light/dark preferences without a style ID retain Botanical. Fresh installs choose Minimal/system/standard. Unavailable storage is tolerated, but preferences then cannot survive a reload.

To add a style, extend `STYLES`, provide light/dark token blocks for both the root and preview selectors, add the material treatment if needed, and extend the browser coverage. Keep semantic foreground/background pairs together, especially hero cards and status badges. Do not use accent colors as a substitute for positive/negative financial meaning.

The later user-supplied Lumin image informed the revised Neon palette and analytical card composition. No card numbers, fake banking integrations, or unimplemented investment/cashback features were copied into the app.

## References supplied for this refresh

The references informed modular hierarchy, data-card composition, typography, restrained color, and a more expressive dark option. Spendwise uses original CSS/layouts and existing local assets, not purchased kits or copied proprietary design files.

- [SpendIQ — Personal Finance SaaS UI Elements](https://dribbble.com/shots/27790407-Personal-Finance-SaaS-UI-UI-Elements-SpendIQ): structured dark financial cards, charts, alerts, and clear type.
- [Mooned Finance Dashboard UI Elements](https://dribbble.com/shots/27019684-UI-elements-for-Mooned-Finance-Dashboard): calm rounded modules and strong hierarchy.
- [Moneed — Clarity Meets Control](https://dribbble.com/shots/27023128-Moneed-Finance-Dashboard-UI-Clarity-Meets-Control): overview composition, cash flow, goals, and actionable summaries.
- [Finas UI Kit](https://ui8.net/pixles-lab-a82382/products/finas---finance-management-dashboard-ui-kit): consistent reusable fintech components and responsive structure.
- [Finexus UI Kit](https://ui8.net/pixel-library/products/finexus--ai-personal-finance-dashboard-ui-kit): layered dark modules and financial-data clarity. No remote AI functionality is implied or added.

## Verification

- Unit tests cover preference defaults, validated IDs, invalid/unavailable storage, legacy migration, and device-mode resolution, alongside existing financial model tests.
- Playwright tests exercise all ten style/mode pairs on desktop and mobile: selection, persistence, unchanged financial storage, theme-aware charts, and axe WCAG A/AA checks on Overview, Settings, and Insights.
- Additional tests cover native-radio keyboard selection, simultaneous Settings/modal controls, larger text, reduced motion, device changes, legacy users, all ten routes per palette, and two-way cross-tab updates.
- Existing transaction, budget, account, transfer, goal, bill, backup, CSV, keyboard, and storage-error regressions remain in place.
- The production subpath/offline check verifies service-worker control, local edits, appearance persistence, reload, and absence of third-party requests.

Automated checks are a regression safety net, not a claim of complete accessibility certification or native-device coverage. The mobile project uses Chromium with an iPhone-sized touch viewport, not Safari.

## Glassmorphism materials and background

`assets/glass-landscape.jpg` is a locally bundled, AI-generated landscape (~95 KB), not a remote photo dependency. The CSS references it once through a shared custom property so the single-file production build embeds it only once. The opaque `--surface` token remains available for form controls and chart tooltips; separate translucent `--glass-panel`, `--glass-chrome`, and `--glass-dialog` roles control frosted materials. Highlight borders and shadows keep the surface hierarchy usable without blur.

The light canvas has a stronger wash and dark supporting text to keep the image from compromising small-label contrast. Colored financial summary tiles use their own dark text roles in both modes. Mobile uses a lower blur radius. Browsers without backdrop-filter get solid panels, and `prefers-reduced-transparency: reduce` removes the decorative scene, removes blur, and uses solid materials without turning colored summary tiles into unreadable dark cards. No background animation was added. Existing reduced-motion behavior is preserved.

`tests/glass.spec.ts` checks all ten pages, Studio and transaction dialogs, both color modes, desktop/mobile, reduced-transparency emulation, and saving a transaction. Production offline verification also selects Glassmorphism, reloads, and asserts that its landscape is embedded. Theme and Analytics matrices derive their styles from `STYLES` so future additions are not silently omitted.
