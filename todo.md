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
- [ ] Subscription swipe-to-delete gesture
- [x] Subscription tap-to-edit modal
- [x] Edit subscription form with all fields
- [ ] End-to-end OAuth testing verification

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
