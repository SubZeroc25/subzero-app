# SubZero — Mobile App Interface Design

## App Overview

SubZero is a subscription tracking and management app. Users sign in, connect their email (Gmail/Outlook), scan their inbox for billing/subscription emails, and view detected subscriptions on a premium dashboard with spending analytics. The app uses a Free/Pro tier model.

## Color Palette

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| primary | #0066FF | #4D94FF | Main accent, CTAs, active states |
| background | #F8F9FB | #0D1117 | Screen backgrounds |
| surface | #FFFFFF | #161B22 | Cards, elevated surfaces |
| foreground | #1A1D21 | #E6EDF3 | Primary text |
| muted | #6B7280 | #8B949E | Secondary text, captions |
| border | #E5E7EB | #30363D | Dividers, card borders |
| success | #10B981 | #34D399 | Active subscriptions, savings |
| warning | #F59E0B | #FBBF24 | Upcoming renewals |
| error | #EF4444 | #F87171 | Cancelled, overdue |

## Screen List

### 1. Landing Screen (Unauthenticated Home)
- Hero section with app tagline: "Track Every Subscription. Save Every Dollar."
- Feature highlights (3 cards): AI-powered scanning, spending analytics, renewal alerts
- Trust/privacy messaging: "Your data stays private. We never store your emails."
- CTA button: "Get Started" → Auth screen
- Bottom: "Already have an account? Sign In"

### 2. Auth Screen
- Clean centered layout with SubZero logo
- "Sign in to SubZero" heading
- OAuth login button (Manus OAuth)
- Privacy note: "We only read billing-related emails. Your data is encrypted."
- Terms & Privacy links at bottom

### 3. Onboarding Screen (Post-Auth, First Time)
- 3-step carousel/wizard:
  - Step 1: "Welcome to SubZero" — brief intro
  - Step 2: "Connect Your Email" — Gmail/Outlook connection buttons
  - Step 3: "We'll Scan for Subscriptions" — explain AI scanning, privacy
- Skip option, progress dots
- Final CTA: "Start Scanning" → triggers scan flow

### 4. Dashboard Screen (Tab: Home)
- Monthly spending summary card (large, prominent)
- "Active Subscriptions" count badge
- Upcoming renewals list (next 7 days)
- Spending trend mini-chart (last 6 months bar chart)
- Quick action: "Scan Now" floating button
- Pro badge if user is on Pro tier

### 5. Subscriptions Screen (Tab: Subscriptions)
- Search bar at top
- Filter chips: All, Active, Cancelled, Trial
- Subscription list (FlatList):
  - Each item: service logo/icon, name, price, billing cycle, next renewal date
  - Swipe actions: Cancel reminder, Mark cancelled
- Empty state: "No subscriptions found. Scan your inbox to get started."
- FAB: "Add Manually" (Pro feature)

### 6. Analytics Screen (Tab: Analytics)
- Total monthly/yearly spend cards
- Category breakdown (pie/donut chart): Entertainment, Productivity, Cloud, etc.
- Monthly trend line chart (12 months)
- Top 5 most expensive subscriptions list
- "Potential Savings" card (Pro feature)
- Export report button (Pro feature)

### 7. Profile Screen (Tab: Profile)
- User avatar, name, email
- Connected accounts section (Gmail/Outlook status)
- Plan section: Free/Pro badge, upgrade CTA
- Settings list:
  - Notification preferences
  - Currency preference
  - Dark mode toggle
  - About / Privacy Policy
- Sign out button
- Delete account (danger zone)

### 8. Pricing Screen (Modal)
- Comparison table: Free vs Pro
- Free: 1 email scan/month, up to 10 subscriptions, basic analytics
- Pro: Unlimited scans, unlimited subscriptions, full analytics, export, manual add, priority support
- Price: $4.99/month or $39.99/year
- CTA: "Upgrade to Pro" (Stripe not live — shows "Coming Soon" toast)
- Restore purchases link

### 9. Scan Flow (Modal/Sheet)
- Step-by-step progress:
  1. "Connecting to email..." (spinner)
  2. "Scanning inbox..." (progress bar with count)
  3. "Analyzing emails with AI..." (animated)
  4. "Found X subscriptions!" (success state)
- Privacy reassurance at each step
- Cancel button
- Results preview before saving

## Key User Flows

### Flow 1: First-Time User
Landing → Sign In → Onboarding → Connect Email → Scan → Dashboard

### Flow 2: Returning User
App Open → Dashboard → View Subscriptions → Analytics

### Flow 3: Scan Inbox
Dashboard "Scan Now" → Scan Modal → Progress → Results → Save → Dashboard refreshes

### Flow 4: Upgrade to Pro
Any Pro-gated feature → Pricing Modal → "Coming Soon" toast

## Navigation Structure

- **Tab Bar** (4 tabs): Dashboard, Subscriptions, Analytics, Profile
- **Stack Screens**: Landing, Auth, Onboarding, Pricing, Scan Flow
- Auth guard: unauthenticated users see Landing → Auth flow
- Onboarding shown once after first login

## Primary Content & Functionality

### Data Models
- **Subscription**: id, userId, name, provider, amount, currency, billingCycle, category, status, nextRenewalDate, detectedFrom, logoUrl, createdAt
- **ScanJob**: id, userId, provider, status, emailsScanned, subscriptionsFound, startedAt, completedAt
- **UserProfile**: extends User with plan (free/pro), onboardingComplete, connectedProviders[], currency, notificationsEnabled

### Pro Gating
- Free: 1 scan/month, 10 subscription limit, basic charts
- Pro: Unlimited everything, export, manual add, savings insights
- Gate checks happen at service level, UI shows lock icons + upgrade CTA
