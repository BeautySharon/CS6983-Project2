# PawTrust Frontend Design Specification

## Design context and references

PawTrust connects pet owners arranging care with sitters finding care tasks. The interface uses a light, approachable visual style with clear forms, readable task information, and explicit action states.

This specification applies to authentication, owner, and sitter pages. Feature scope and business behavior come from [PRD](docs/PRD.md) and the target issue. Page composition and field order follow [the current mockup](docs/mockups/pawtrust-mockup.png). Shared visual treatments are derived from the previous PawTrust frontend:

- [LoginPage](https://github.com/BeautySharon/CS5610_Final_Project/blob/main/pawtrust-frontend/src/pages/LoginPage.jsx): gradient background, constrained auth layout, rounded inputs, indigo actions, password visibility control.
- [RegisterPage](https://github.com/BeautySharon/CS5610_Final_Project/blob/main/pawtrust-frontend/src/pages/RegisterPage.jsx): labeled fields, form spacing, card surface, secondary navigation.
- [OwnerDashboard](https://github.com/BeautySharon/CS5610_Final_Project/blob/main/pawtrust-frontend/src/pages/OwnerDashboard.jsx): desktop 4/8-column split, cards, section headings.
- [SitterDashboard](https://github.com/BeautySharon/CS5610_Final_Project/blob/main/pawtrust-frontend/src/pages/SitterDashboard.jsx): three equal desktop columns, status colors and pagination.

Reference styles inspected on November 2, 2026. These references establish visual patterns, not API contracts or additional product features. Use this document for subsequent implementation; consult the source only to resolve an unspecified visual detail.

## Palette and typography

Use Tailwind 3.4 utilities and its default sans-serif font stack. Do not load an additional font.

| Purpose | Tokens |
| --- | --- |
| Page background | `bg-gradient-to-br from-indigo-50 via-white to-sky-50` |
| Main text / headings | `text-slate-900` |
| Body / secondary text | `text-slate-600`; hints may use `text-slate-500` on white |
| Field labels | `text-sm font-medium text-slate-700` |
| Primary action | `bg-indigo-600 text-white hover:bg-indigo-700` |
| Links | `text-indigo-600 font-medium hover:underline` |
| Input border | `border-slate-300` |
| Field focus | `focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100` |
| Error | `bg-rose-50 text-rose-800 ring-1 ring-rose-200` |
| Success | `bg-emerald-50 text-emerald-800` |

Brand: `text-3xl font-bold tracking-tight`. Page headings: `text-2xl font-semibold`. Card headings: `text-lg font-semibold`. Body: `text-base`; labels and supporting text: `text-sm`; brief hints and badges: `text-xs`. Keep one page-level heading and a logical section hierarchy.

## Spacing, surfaces and controls

- Use the Tailwind spacing scale: 4px for label/input separation, 8px for closely related content, 16px between form fields, 24px between sections or columns.
- Auth content: `w-full max-w-md`, centered horizontally, with at least 16px outer padding and 24px card padding. Allow vertical scrolling on short screens.
- Auth card: `rounded-2xl bg-white/80 backdrop-blur shadow-xl ring-1 ring-black/5 p-6`.
- Dashboard card: `rounded-2xl bg-white ring-1 ring-slate-200`; use 16px or 24px padding and a subtle shadow where needed.
- Inputs, selects and textareas: `w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 shadow-sm`, with the field-focus tokens above.
- Primary auth button: full width, `rounded-xl px-4 py-2.5 font-medium shadow-sm`, primary colors, visible focus ring. Compact dashboard actions use `rounded-md px-3 py-1` as specified in AGENTS.md.
- Secondary buttons: white background, slate border/ring, slate text. Destructive actions: `ring-1 ring-rose-300 text-rose-700 hover:bg-rose-50`.
- Disabled buttons remain labeled, have reduced opacity, and cannot submit again. Use a pending label while a request is running.
- Use simple paw branding, with an indigo icon and slate wordmark. Decorative icons are hidden from assistive technology; icon-only controls need an accessible name.
- Use subtle color/shadow transitions only. Keep the background gradient unobstructed; the reference's decorative dot texture is not part of the current mockup.

## Authentication pages — Issue #6

Place the PawTrust brand and the tagline “Connect pet owners with trusted sitters.” above the card.

**Login:** card title “Login”, supporting text “Welcome back! Please sign in to continue.”, Email and Password, full-width “Login” button, and “Don't have an account? Register here”.

**Register:** card title “Create an Account”, supporting text “Join PawTrust as a pet owner or pet sitter.”, then Name, Email, Password, User Type, Location, and Bio (optional). Use labeled Pet Owner / Pet Sitter radio controls as shown in the current mockup. End with “Create Account” and “Already have an account? Login here”.

Example placeholders may explain expected input but never replace labels. Keep the current PRD's minimum eight-character password requirement. Use the reference's text-based Show/Hide password button with an accessible name and pressed state; it provides the visibility interaction represented by the mockup's eye icon.

Preserve input on failed requests, show errors near submission controls, and announce errors/status messages. Navigate only after a successful server response. Authentication logic follows AGENTS.md, including JWT storage and 401 handling.

## Dashboard layouts — Issues #8 and #10

Below 1024px (`lg`), stack sections in reading order with full-width controls. At `lg` and above, use `grid grid-cols-1 lg:grid-cols-12 gap-6 items-start`.

- **Owner:** Post Task occupies 4 columns; My Tasks occupies 8. Display pet type, date, duration, location, textual status and application count. Show three tasks per page with Prev, page count and Next. Confirm deletion and show Delete only for eligible open tasks.
- **Sitter:** Available, Accepted, and Finished & Reviews each occupy 4 columns. Keep an optional labeled application message beside or above Apply. Already-applied items display a disabled “Applied” action. Completion and review functionality remain in their respective issues.
- Retain the mockup's brand/navigation header, greeting and supporting sentence. Allow long task descriptions and locations to wrap. Do not require fixed-height panels or nested scrolling on mobile.
- Render explicit loading, empty and error states inside the relevant section. Keep pagination visible and disable unavailable directions.

| Status | Badge colors |
| --- | --- |
| Open | `bg-sky-50 text-sky-700 ring-sky-200` |
| Assigned / pending | `bg-amber-50 text-amber-700 ring-amber-200` |
| Finished / accepted | `bg-emerald-50 text-emerald-700 ring-emerald-200` |
| Not selected / neutral | `bg-slate-50 text-slate-600 ring-slate-200` |

Badge shape: `text-xs px-2 py-1 rounded-full ring-1`. Always include a readable label; color alone must not communicate state.

## Implementation and review

Read this specification and the relevant mockup before implementing a frontend issue. Reuse shared components and style constants rather than introducing page-specific variants. `src/components/AuthLayout.jsx` owns authentication control styles; `AuthForm.jsx` owns the shared form structure.

Check keyboard operation, visible focus, associated labels, readable contrast, error announcements, pending states and narrow-screen overflow. Validate both successful and failed interactions. Record any deliberate design change in this specification and update affected components together.

Do not import the previous project's authentication, calendar, editing or other feature behavior unless the current PRD and issue require it. API calls, authorization and testing follow AGENTS.md.
