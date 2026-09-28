# Red-E Now Design System

Design System

Colors:

Primary/Brand: 
#C8102E (red)
Background: 
#F7F7F4 (warm off-white)
Surface/Cards: 
#FFFFFF
Text Primary: 
#1A1A1A
Text Secondary: 
#6B7280
Text Muted: 
#9CA3AF
Border: 
#E5E5E5
Success: 
#16A34A
Warning: 
#F59E0B
Error: 
#DC2626
Info: 
#2563EB

Typography:

Headings: "Barlow Condensed" (Google Fonts), semibold/bold, uppercase for section headers
Body: "Jost" (Google Fonts), regular/medium
Mono/Codes/Labels: "DM Mono" (Google Fonts)

Spacing & Layout:

Base unit: 4px grid
Page padding: 32px top, 24px sides, 32px bottom
Card gap: 20px
Border radius: 12px for cards, 8px for inputs/buttons
Shadows: subtle, low-elevation (0 1px 3px rgba(0,0,0,0.08))
Mobile frame: 390×844px reference

Design Style: Modern SaaS / premium residential operations. Swiss-inspired — clean grid, precise alignment, function-first. Generous whitespace, calm and polished. No glassmorphism, no neon, no excessive animation.

Pages to Build
1. Resident Login (/login)
Logo/brand mark at top ("Red-E Now" wordmark in Barlow Condensed, primary red)
Email and password fields
"Sign In" button (primary red, full width)
"Forgot password?" link
"Don't have an account? Sign Up" link → /signup
Clean, centered card layout on the off-white background
2. Resident Sign Up (/signup)
Full name, email, phone, unit number, building code fields
Password + confirm password
"Create Account" button
"Already have an account? Sign In" link → /login
3. Resident Password Recovery (/forgot-password)
Email field
"Send Reset Link" button
Back to login link
4. Staff/Management Login (/staff/login)
Same layout as resident login but with "Management Portal" subtitle
Email and password
"Sign In" button
"Forgot password?" link
No sign-up link (staff accounts are created by admin)
5. Staff Password Recovery (/staff/forgot-password)
Same as resident recovery but routed for staff
6. Resident Home / Dashboard (/dashboard)
Top bar: "Red-E Now" logo left, profile icon/avatar right
Greeting: "Welcome back, [Name]" with current date
Section: "Your Packages" — show an empty state component ("No packages waiting for you right now") with a package icon
Section: "Upcoming Pickups" — empty state ("No pickups scheduled")
Bottom navigation bar with icons + labels: Home, Packages, Schedule, History, Profile
Mobile-first layout (390px width)
7. Staff Dashboard (/staff/dashboard)
Top bar: "Red-E Now" logo left, "Management" badge, profile icon right
Greeting: "Welcome back, [Name]" with building name ("Oakwood Residences") and date
4 stat cards in a 2×2 grid: "Waiting Packages" (0), "Today's Pickups" (0), "Prepared" (0), "Completed Today" (0) — each with an icon and the count
Section: "Recent Activity" — empty state ("No recent activity")
Section: "Quick Actions" — buttons for "Add Package", "Today's Queue", "Search Resident"
Sidebar navigation (desktop) or hamburger menu (mobile): Dashboard, Register Package, Packages, Today's Pickups, Upcoming, Preparation Queue, Residents, History, Account, Logout
Routing & Auth
Use React Router v6
Protected routes: /dashboard/* requires resident auth, /staff/dashboard/* requires staff auth
Unauthenticated users redirect to /login
After login, residents go to /dashboard, staff go to /staff/dashboard
Use React Context for auth state (no real backend yet — mock auth with hardcoded test users: resident maya@test.com / password123 and staff admin@test.com / password123)
Store auth state and user role in context
Reusable Components to Create

Build these as a shared component library in src/components/common/:

Button — variants: primary (red), secondary (outlined), ghost, destructive. Sizes: sm, md, lg. Full-width option.
TextInput — with label, placeholder, error state, helper text. Types: text, email, password, tel.
StatusBadge — colored pill for status labels (received=blue, available=green, scheduled=yellow, prepared=orange, picked_up=gray)
Card — white surface with subtle shadow and border radius
EmptyState — centered icon + message + optional action button
LoadingSpinner — simple spinner in primary red
Toast — success/error/info notification, slides in from top
Modal — overlay dialog with title, content, actions
Avatar — circle with initials or image
Project Structure
src/
  api/           (empty folder — API layer comes later)
  assets/        (logo, icons)
  components/
    common/      (Button, TextInput, StatusBadge, Card, EmptyState, LoadingSpinner, Toast, Modal, Avatar)
    auth/        (LoginForm, SignUpForm, ForgotPasswordForm)
    resident/    (ResidentHome, BottomNav)
    dashboard/   (StaffDashboard, StatCard, Sidebar)
  context/       (AuthContext.tsx)
  hooks/         (useAuth.ts)
  layouts/       (ResidentLayout, StaffLayout)
  pages/
    auth/        (LoginPage, SignUpPage, ForgotPasswordPage, StaffLoginPage, StaffForgotPasswordPage)
    resident/    (ResidentDashboardPage)
    staff/       (StaffDashboardPage)
  routes/        (AppRouter, ProtectedRoute)
  styles/        (design tokens, global styles)
  utils/         (helpers)
Important Notes
Use TypeScript
Use Tailwind CSS for styling, with design tokens defined as CSS custom properties in :root
Mobile-first responsive design — resident pages optimized for phone (390px), staff pages optimized for desktop but must work on tablet/phone
All interactive elements need hover/focus/active states
Handle states: loading (spinner), empty (EmptyState component), error (Toast or inline message)
Import Google Fonts: Barlow Condensed, Jost, DM Mono
No real backend — mock everything with context and hardcoded data for now

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d5486355-0092-40ca-b7b5-8f05b80fd143).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
