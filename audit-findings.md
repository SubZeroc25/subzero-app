# SubZero Comprehensive Audit Findings

## Category 1: Dead-End / Non-Functional UI Elements

1. **Profile > Privacy Policy button** — `onPress={() => {}}` — does nothing
2. **Profile > About SubZero button** — `onPress={() => {}}` — does nothing
3. **Analytics > Export Report button** — shows "Coming Soon" alert for Pro users — should either work or be removed
4. **Profile > Currency** — displays "USD" but no way to change it (no picker/modal)

## Category 2: Missing Route Registration

5. **cancel-subscription screen** — not registered in `app/_layout.tsx` Stack, so navigation may fail on some platforms

## Category 3: Edit Subscription Data Loading Bug

6. **edit-subscription.tsx** — In edit mode, the form fields are never populated with existing subscription data. There's no query to fetch the subscription by ID and no `useEffect` to populate form state. Users open the edit screen and see blank fields.

## Category 4: Subscription Card UX Issues

7. **Double delete confirmation** — `handleDelete` in `subscriptions.tsx` shows Alert, then `SubscriptionCard.handleDelete` also shows Alert. The swipe delete action triggers the card's own Alert, which is correct, but the parent's `handleDelete` is never called from swipe (the card handles it). Actually reviewing more carefully: the card's `onDelete` prop IS the parent's `handleDelete` which shows an Alert, and the card's own `handleDelete` ALSO shows an Alert before calling `onDelete`. So there's a double-confirmation bug on swipe delete.

## Category 5: Billing Cycle Calculation Gaps

8. **totalMonthly calculation** in `subscriptions.tsx` only handles `yearly` and defaults everything else to monthly. Missing: `weekly` (×4.33), `quarterly` (÷3), `one-time` (should be excluded or noted).
9. **Same issue on dashboard** — analytics `totalMonthly` from server may have same gap (need to check db.ts).

## Category 6: Missing Icon Mappings

10. **chevron.up / chevron.down** — used in edit-subscription discount toggle but not in icon-symbol.tsx MAPPING
11. **xmark.circle.fill** — used in cancel-subscription error step but not mapped
12. **arrow.left** — used in cancel-subscription header but not mapped
13. **arrow.clockwise** — used in cancel-subscription regenerate button but not mapped
14. **pencil** — used in cancel-subscription "what happens" section but not mapped
15. **eye.fill** — used in cancel-subscription "what happens" section but not mapped
16. **clock.fill** — used in cancel-subscription sent step but not mapped
17. **rectangle.stack.fill** — used in subscriptions empty state but not mapped
18. **magnifyingglass** — used in subscriptions search but not mapped
19. **plus** — used in subscriptions add button but not mapped
20. **calendar** — used in dashboard yearly display but not mapped

## Category 7: Version String Inconsistency

21. **Profile shows "SubZero v1.5.0"** but `app.config.ts` has `version: "1.0.0"` — should be consistent

## Category 8: Hardcoded Strings / Polish

22. **Dashboard "Can Save"** stat shows potential savings but this is a Pro-only feature on Analytics — inconsistent gating
23. **Scan screen** falls back to sample/mock data when no email is connected — this creates fake subscriptions for users, which is confusing in production

## Category 9: State Management

24. **AppContext `refreshProfile`** creates a new function reference on every render because `profileQuery` changes — should use `useRef` pattern
25. **Cached AsyncStorage state can override server data** — race condition where cached state loads first, then server data arrives, but if server query fails, stale cached data persists

## Category 10: Missing Features / Incomplete Flows

26. **No way to re-activate a cancelled subscription** — once cancelled via "Cancel For Me", the status is set to "cancelled" and the "Cancel For Me" button disappears, but there's no "Reactivate" option
27. **Onboarding screen** exists but flow from onboarding to main app may not refresh profile state properly

## Category 11: TypeScript / Code Quality

28. **Multiple `as any` casts** on router.push calls — should use proper typed routes
29. **Unused `pollRef`** in scan.tsx — declared but never used (was replaced by react-query refetchInterval)
