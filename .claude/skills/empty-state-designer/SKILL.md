---
name: empty-state-designer
description: Design and implement empty, loading, and error states for a screen or list. Use when the user asks for "empty state", "no data view", or when scaffolding a list-bearing screen.
---

# Empty State Designer

Every data-bearing surface needs three states beyond the happy path: loading, empty, error.

## Pattern

```
const { data, isLoading, error } = useQuery(...);

if (isLoading) return <SkeletonView />;       // skeleton, not spinner, when shape is known
if (error) return <ErrorState onRetry={refetch} />;
if (!data?.length) return <EmptyState ... />;
return <List data={data} />;
```

## Empty state copy

- Lead with the user's situation, not the tech: "No subscriptions yet" beats "No data".
- Follow with a single CTA that resolves the emptiness: e.g. Subscriptions empty → "Scan your inbox" button.
- Reference `design.md` § for the exact wording per screen (e.g. Subscriptions: "No subscriptions found. Scan your inbox to get started.").

## Visual

- Centered vertically within the available area.
- Optional illustration/icon at 64–96pt, `text-muted` tint.
- Heading `text-lg font-semibold text-foreground`.
- Body `text-sm text-muted` — one sentence.
- Primary action button using the project's Button primitive.

## Error state

- Title: "Something went wrong".
- Body: human cause if known (network, auth), otherwise generic.
- Actions: "Try again" (retry) + secondary "Contact support" if Pro.
- Never expose stack traces.

## Loading

- Prefer skeletons matching list-row shape — see `loading-skeleton` skill.
- Spinners only for indeterminate one-shot actions (≤2s).
