# SubZero TODO

- [x] Theme configuration (SubZero brand colors)
- [x] Icon symbol mapping for all tabs
- [x] Tab bar layout (Dashboard, Subscriptions, Analytics, Profile)
- [x] Database schema (subscriptions, scanJobs, userProfiles)
- [x] Server API routes (subscriptions CRUD, scan jobs, analytics, profile)
- [x] AI extraction service (LLM-based email parsing)
- [x] Landing screen (unauthenticated)
- [x] Auth screen (login)
- [x] Onboarding screen (post-auth wizard)
- [x] Dashboard screen (spending summary, upcoming renewals)
- [x] Subscriptions screen (list, search, filter)
- [x] Analytics screen (charts, category breakdown, trends)
- [x] Profile screen (settings, connected accounts, plan)
- [x] Pricing screen (Free vs Pro comparison)
- [x] Scan flow modal (progress states, AI scanning)
- [x] Pro gating logic (feature locks, upgrade prompts)
- [x] Auth guard (redirect unauthenticated users)
- [x] App context/state management (subscriptions, user profile)
- [x] App logo generation and branding

## Bug Fixes

- [x] OAuth redirect URI using manus* scheme instead of exp://

## New Features

- [x] Gmail OAuth integration in onboarding
- [x] Outlook OAuth integration in onboarding
- [x] Email provider selection screen
- [x] Subscription swipe-to-delete gesture
- [x] Subscription tap-to-edit modal
- [x] Edit subscription form with all fields
- [x] End-to-end OAuth testing verification

## Phase 2: Enhanced Features

- [x] Swipe-to-delete gesture on subscription cards
- [x] Gmail OAuth configuration and credential setup
- [x] Outlook OAuth configuration and credential setup
- [x] Push notification system for renewal reminders
- [x] Renewal reminder scheduling logic
- [x] Notification permission handling

## Phase 3: Email Scanning & Validation

- [x] Email provider credential secrets (Gmail, Outlook)
- [x] Email provider credential validation
- [x] Email scanning worker service
- [x] Gmail API email fetching
- [x] Outlook API email fetching
- [x] Subscription editing form validation
- [x] Amount and date validation
- [x] Error handling and user feedback

## Bug Fixes (Phase 4)

- [x] Fix connections/sign-in not working
- [x] Fix EXPO_PUBLIC_APP_ID not set for Metro bundler
- [x] Fix cookie domain extraction for multi-segment domains (us2.manus.computer)
- [x] Fix session token name field empty causing verification failure
- [x] Use WebBrowser.openAuthSessionAsync for native OAuth flow
- [x] Add native deep link redirect from server OAuth callback

## Phase 5: External Service Integrations

### Gmail API Integration
- [x] Gmail OAuth consent screen configuration
- [x] Gmail API credential environment variables
- [x] Gmail OAuth flow (authorize, token exchange, refresh)
- [x] Gmail API email fetching service (real inbox scanning)
- [x] Gmail token storage in database
- [x] Gmail connection status in Profile screen

### Stripe Integration
- [x] Stripe API credential environment variables
- [x] Stripe checkout session creation (Pro plan)
- [x] Stripe webhook handler (payment events)
- [x] Stripe customer portal for subscription management
- [x] Pro plan activation on successful payment
- [x] Billing status display in Profile screen

## Bug Fixes (Phase 6)

- [x] Fix dev server connectivity issue (Metro bundler not reachable)
- [x] Fix Google OAuth 403 error on sign-in
- [x] Fix email provider callback URLs using localhost instead of public URL
- [x] Fix email-scanner.ts import paths
- [x] Fix test mocks for new getEmailToken function

## Phase 7: Admin Panel, Discounts, Pro Fix, Polish

### Admin Panel
- [x] Admin tab/screen with role-based access
- [x] User management (list users, view details, toggle plan)
- [x] Subscription oversight (all subscriptions across users)
- [x] Platform analytics (total users, revenue, scan stats)
- [x] Admin role check and guard

### Subscription Discounts
- [x] Discount field on subscriptions (percentage or fixed amount)
- [x] Discount display on subscription cards
- [x] Discount input in edit subscription form
- [x] Discounted price calculation in analytics

### Pro Upgrade Fix
- [x] Fix Pro upgrade to work without live Stripe
- [x] In-app Pro activation flow (promo code redemption)
- [x] Pro plan visual confirmation

### Next-Level Polish
- [x] Empty state illustrations and messaging
- [x] Pull-to-refresh on Dashboard and Subscriptions
- [x] Haptic feedback on key interactions
- [x] Visual refinements (gradients, shadows, spacing)
- [x] Manual subscription entry button
- [ ] Dark mode toggle in Profile
- [ ] Skeleton loading states
- [ ] Animated transitions between screens

## Phase 8: Connect to Stripe

- [ ] Set up STRIPE_SECRET_KEY (configure in Settings > Secrets panel)
- [ ] Set up STRIPE_WEBHOOK_SECRET (configure in Settings > Secrets panel)
- [x] Set up STRIPE_PRO_PRICE_ID (price_1TI4asAQPRHUVpg4QCF8LdjZ)
- [ ] Verify Stripe checkout session creation works
- [ ] Verify Stripe webhook handler processes events
- [ ] Verify Stripe customer portal access
