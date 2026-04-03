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

- [x] Set up STRIPE_SECRET_KEY
- [x] Set up STRIPE_WEBHOOK_SECRET
- [x] Set up STRIPE_PRO_PRICE_ID (price_1TI4asAQPRHUVpg4QCF8LdjZ)
- [x] Verify Stripe API key works (product list test passes)
- [x] Verify Stripe webhook secret configured
- [ ] Verify Stripe checkout session creation works (end-to-end)
- [ ] Verify Stripe customer portal access (end-to-end)

## Phase 9: Pricing Update

- [x] Update Pro price from $4.99 to $9.99/month across all screens

## Phase 10: Aggressive Cancellation Email Feature

- [x] Research Gmail MCP tools for sending emails on behalf of user
- [x] Build cancellation email template generator with AI (aggressive/formal tone)
- [x] Create server-side cancellation service that sends emails to subscription providers
- [x] Add known provider cancellation email addresses database
- [x] Build cancellation UI flow with "Cancel for Me" button on subscription cards
- [x] Add cancellation confirmation modal with email preview
- [x] Track cancellation email status (sent, pending, follow-up needed)
- [x] Add follow-up email capability for providers that don't respond
- [x] Update subscription status after cancellation email is sent
- [x] Write tests for the cancellation feature (17 tests, all passing)

## Phase 11: Production Audit & Fixes

### Calculations & Data
- [x] Fix totalMonthly calculation to handle weekly, quarterly, one-time billing cycles
- [x] Fix server-side category breakdown monthly normalization for all billing cycles
- [x] Fix edit-subscription form not loading existing data in edit mode

### UI & Navigation
- [x] Add all missing category icons (play, hammer, cloud, heart, book, cart, newspaper, people, ellipsis)
- [x] Fix double-delete confirmation on subscription cards (card + parent both showing Alert)
- [x] Add cancel-subscription route to Stack layout
- [x] Fix Privacy Policy button (was dead-end, now opens web browser)
- [x] Fix About button (was dead-end, now shows app info dialog)
- [x] Fix version string (was "v0.1.0 Beta", now "v1.0.0")
- [x] Make currency setting tappable with picker (was static display)
- [x] Implement Export Report button (copies formatted report to clipboard for Pro users)

### State Management
- [x] Fix refreshProfile callback stability (useRef pattern to avoid unstable reference)
- [x] Fix AsyncStorage race condition (server data now takes priority over stale cache)

### Code Quality
- [x] Remove unused pollRef from scan.tsx
- [x] Fix brittle Stripe tests (skip when env vars not set, remove hardcoded price ID)

### Test Results
- [x] All 58 tests passing, 0 TypeScript errors

## Phase 12: Gmail OAuth Fix

- [ ] Fix Gmail OAuth 401 invalid_client error when connecting Gmail

## Phase 13: Remove OAuth Dependency — Zero-Config for All Users

### Remove Gmail/Outlook OAuth
- [x] Remove Gmail/Outlook OAuth credential requirements (GMAIL_CLIENT_ID, etc.)
- [x] Remove email provider OAuth routes from server
- [x] Remove email connection UI from Profile screen
- [x] Remove email connection step from Onboarding

### Redesign Scan Flow (Receipt/Screenshot Import)
- [x] Replace email scanning with photo/screenshot import (camera + photo library)
- [x] Use server's built-in LLM to extract subscription info from receipt images
- [x] Keep manual subscription entry as primary flow

### Redesign Cancellation Flow (Open in Mail App)
- [x] Replace OAuth-based email sending with expo-mail-composer
- [x] AI generates the aggressive email, user sends from their own mail app
- [x] No credentials needed — works for every user out of the box

### Cleanup
- [x] Update tests for new flows
- [ ] Remove unused email-providers.ts and email-scanner.ts (kept for reference, not imported)
- [x] Remove GMAIL_CLIENT_ID/SECRET and OUTLOOK_CLIENT_ID/SECRET env vars (no longer required)

## Phase 14: Web Platform Compatibility

- [x] Cancel-subscription: add mailto: link fallback + copy-to-clipboard on web (expo-mail-composer is mobile-only)
- [x] Scan flow: verify expo-image-picker works on web (uses file input), add fallback if needed
- [x] Audit all Platform.OS checks for consistent web experience
- [x] Ensure all screens render correctly on both mobile and web

## Phase 15: APK Build Fix

- [x] Fix Gradle build failure: react-native-gesture-handler compileReleaseJavaWithJavac dependency resolution (pinned kotlinVersion=2.1.20, compileSdkVersion=36, targetSdkVersion=36)

## Phase 16: Web Deployment Fix

- [x] Add static file serving to production server for web export
- [x] Update build script to include expo web export alongside server build
- [x] Verify dist/web contains all static HTML pages and assets

## Phase 17: Deployment Fixes

- [x] Fix backend deployment: Metro crashes in Docker during expo web export - revert to server-only build
- [x] Fix APK build: set minSdkVersion to 24 for react-native-worklets compatibility (already set)
