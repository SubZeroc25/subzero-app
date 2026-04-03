# OAuth Removal Redesign Notes

## Files to modify:

### Server-side:
1. **server/routers.ts** - Remove `emailProvider` from cancellation.sendEmail, replace scan.start to accept image URL instead of provider
2. **server/cancellation-service.ts** - Remove sendCancellationViaGmail and sendCancellationViaOutlook functions (keep getProviderContact and generateCancellationEmail)
3. **server/external-routes.ts** - Remove all Gmail/Outlook OAuth routes (keep Stripe routes)
4. **server/ai-extraction.ts** - Add new function extractSubscriptionsFromImage that uses LLM with image_url
5. **server/email-scanner.ts** - Can be deleted entirely (or gutted)
6. **server/email-providers.ts** - Can be deleted entirely

### Client-side:
7. **app/scan.tsx** - Replace Gmail/Outlook choice with photo picker (camera/library), upload image to server, extract via AI
8. **app/cancel-subscription.tsx** - Remove email provider selection, use expo-mail-composer to open native mail app with pre-filled email
9. **app/onboarding.tsx** - Remove "Connect Your Email" step, replace with receipt scanning intro
10. **app/(tabs)/profile.tsx** - Remove "Connected Accounts" section, remove handleConnectEmail/handleDisconnectEmail
11. **lib/app-context.tsx** - Remove connectedGmail/connectedOutlook from state

### Tests:
12. **tests/email-providers.test.ts** - Delete
13. **tests/gmail-oauth.test.ts** - Delete
14. **tests/cancellation.test.ts** - Update to remove email provider references

### Packages to install:
- expo-image-picker (for receipt photo)
- expo-mail-composer (for opening native mail app)
