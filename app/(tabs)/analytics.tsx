import { ScrollView, Text, View, Pressable, Platform, ActivityIndicator, RefreshControl } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import { useState, useCallback, useMemo } from "react";
import * as Clipboard from "expo-clipboard";

const CATEGORY_COLORS: Record<string, string> = {
  entertainment: "#EF4444",
  productivity: "#3B82F6",
  cloud: "#8B5CF6",
  finance: "#10B981",
  health: "#F59E0B",
  education: "#06B6D4",
  shopping: "#EC4899",
  news: "#6366F1",
  social: "#14B8A6",
  utilities: "#64748B",
  other: "#9CA3AF",
};

const CATEGORY_ICONS: Record<string, string> = {
  entertainment: "play.fill",
  productivity: "hammer.fill",
  cloud: "cloud.fill",
  finance: "chart.bar.fill",
  health: "heart.fill",
  education: "book.fill",
  shopping: "cart.fill",
  news: "newspaper.fill",
  social: "person.2.fill",
  utilities: "gear",
  other: "ellipsis",
};

export default function AnalyticsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const analyticsQuery = trpc.analytics.spending.useQuery(undefined, { enabled: isAuthenticated });
  const profileQuery = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const activeQuery = trpc.subscriptions.active.useQuery(undefined, { enabled: isAuthenticated });

  const analytics = analyticsQuery.data;
  const isPro = profileQuery.data?.plan === "pro";

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([analyticsQuery.refetch(), profileQuery.refetch(), activeQuery.refetch()]);
    setRefreshing(false);
  }, []);

  // Compute discount savings
  const discountSavings = useMemo(() => {
    const subs = activeQuery.data ?? [];
    const withDiscounts = subs.filter((s) => s.discountAmount && Number(s.discountAmount) > 0);
    const totalSaved = withDiscounts.reduce((acc, s) => acc + Number(s.discountAmount || 0), 0);
    return { count: withDiscounts.length, total: totalSaved };
  }, [activeQuery.data]);

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="px-6">
        <View className="flex-1 items-center justify-center">
          <View className="w-16 h-16 rounded-2xl items-center justify-center mb-4" style={{ backgroundColor: colors.muted + "15" }}>
            <IconSymbol name="lock.fill" size={32} color={colors.muted} />
          </View>
          <Text className="text-lg font-semibold text-foreground mt-2">Sign in Required</Text>
          <Text className="text-sm text-muted text-center mt-2">Sign in to view your analytics</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (analyticsQuery.isLoading) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-sm text-muted mt-3">Loading analytics...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View className="pt-4 mb-5">
          <Text className="text-2xl font-bold text-foreground">Analytics</Text>
          <Text className="text-sm text-muted mt-1">Your spending insights</Text>
        </View>

        {/* Spending Summary Cards */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-primary rounded-2xl p-5">
            <Text className="text-white/70 text-xs font-medium">Monthly</Text>
            <Text className="text-white text-3xl font-bold mt-1">
              ${analytics?.totalMonthly?.toFixed(2) ?? "0.00"}
            </Text>
          </View>
          <View className="flex-1 bg-surface rounded-2xl p-5 border border-border">
            <Text className="text-muted text-xs font-medium">Yearly</Text>
            <Text className="text-foreground text-3xl font-bold mt-1">
              ${analytics?.totalYearly?.toFixed(2) ?? "0.00"}
            </Text>
          </View>
        </View>

        {/* Discount Savings Card */}
        {discountSavings.count > 0 && (
          <View className="rounded-2xl p-5 mb-4 border border-border" style={{ backgroundColor: colors.success + "08" }}>
            <View className="flex-row items-center gap-2 mb-2">
              <IconSymbol name="tag.fill" size={16} color={colors.success} />
              <Text className="text-sm font-semibold" style={{ color: colors.success }}>Active Discounts</Text>
            </View>
            <View className="flex-row items-baseline gap-1">
              <Text className="text-3xl font-bold" style={{ color: colors.success }}>
                ${discountSavings.total.toFixed(2)}
              </Text>
              <Text className="text-sm text-muted">/month saved</Text>
            </View>
            <Text className="text-xs text-muted mt-1">
              Across {discountSavings.count} subscription{discountSavings.count > 1 ? "s" : ""} with discounts
            </Text>
          </View>
        )}

        {/* Category Breakdown */}
        <View className="bg-surface rounded-2xl p-5 border border-border mb-4">
          <Text className="text-base font-semibold text-foreground mb-4">Category Breakdown</Text>
          {!analytics?.categoryBreakdown?.length ? (
            <View className="py-6 items-center">
              <View className="w-12 h-12 rounded-2xl items-center justify-center mb-3" style={{ backgroundColor: colors.primary + "10" }}>
                <IconSymbol name="chart.bar.fill" size={24} color={colors.primary} />
              </View>
              <Text className="text-sm text-muted text-center">
                Scan your inbox to see category breakdown
              </Text>
            </View>
          ) : (
            <>
              {analytics.categoryBreakdown.map((cat, i) => {
                const maxAmount = Math.max(...analytics.categoryBreakdown.map((c) => c.amount), 1);
                const width = Math.max((cat.amount / maxAmount) * 100, 8);
                const catColor = CATEGORY_COLORS[cat.category] || CATEGORY_COLORS.other;
                const totalMonthly = analytics.totalMonthly || 1;
                const pct = ((cat.amount / totalMonthly) * 100).toFixed(0);
                return (
                  <View key={i} className="mb-4">
                    <View className="flex-row items-center justify-between mb-1.5">
                      <View className="flex-row items-center gap-2">
                        <View className="w-7 h-7 rounded-lg items-center justify-center" style={{ backgroundColor: catColor + "15" }}>
                          <IconSymbol name={(CATEGORY_ICONS[cat.category] || "ellipsis") as any} size={14} color={catColor} />
                        </View>
                        <Text className="text-sm font-medium text-foreground capitalize">{cat.category}</Text>
                        <Text className="text-xs text-muted">({cat.count})</Text>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-sm font-semibold text-foreground">
                          ${cat.amount.toFixed(2)}
                        </Text>
                        <Text className="text-xs text-muted">{pct}%</Text>
                      </View>
                    </View>
                    <View className="h-2.5 bg-border rounded-full overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{ width: `${width}%`, backgroundColor: catColor }}
                      />
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>

        {/* Monthly Trend */}
        <View className="bg-surface rounded-2xl p-5 border border-border mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base font-semibold text-foreground">Monthly Trend</Text>
            {analytics?.monthlyTrend && analytics.monthlyTrend.length > 0 && (
              <Text className="text-xs text-muted">Last {analytics.monthlyTrend.length} months</Text>
            )}
          </View>
          {!analytics?.monthlyTrend?.length ? (
            <View className="py-6 items-center">
              <Text className="text-sm text-muted">No trend data available yet</Text>
            </View>
          ) : (
            <View className="flex-row items-end justify-between" style={{ height: 120 }}>
              {analytics.monthlyTrend.map((m, i) => {
                const maxAmount = Math.max(...analytics.monthlyTrend.map((t) => t.amount), 1);
                const height = Math.max((m.amount / maxAmount) * 90, 6);
                const isLast = i === analytics.monthlyTrend.length - 1;
                return (
                  <View key={i} className="items-center flex-1 gap-1">
                    <Text className="text-[8px] text-muted">
                      {m.amount > 0 ? `$${m.amount.toFixed(0)}` : ""}
                    </Text>
                    <View
                      style={{
                        height,
                        backgroundColor: isLast ? colors.primary : colors.primary + "30",
                        borderRadius: 6,
                        width: "50%",
                      }}
                    />
                    <Text className="text-[10px] text-muted font-medium">{m.month}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Top Subscriptions */}
        <View className="bg-surface rounded-2xl p-5 border border-border mb-4">
          <Text className="text-base font-semibold text-foreground mb-4">Top Subscriptions</Text>
          {!analytics?.topSubscriptions?.length ? (
            <View className="py-6 items-center">
              <Text className="text-sm text-muted">No subscriptions found</Text>
            </View>
          ) : (
            analytics.topSubscriptions.map((sub, i) => (
              <View
                key={i}
                className="flex-row items-center justify-between py-3"
                style={
                  i < (analytics.topSubscriptions?.length ?? 0) - 1
                    ? { borderBottomWidth: 0.5, borderBottomColor: colors.border }
                    : {}
                }
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-lg items-center justify-center" style={{ backgroundColor: colors.primary + "10" }}>
                    <Text className="text-sm font-bold text-primary">{i + 1}</Text>
                  </View>
                  <View>
                    <Text className="text-sm font-medium text-foreground">{sub.name}</Text>
                    <Text className="text-xs text-muted capitalize">{sub.billingCycle}</Text>
                  </View>
                </View>
                <Text className="text-sm font-bold text-foreground">${sub.amount.toFixed(2)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Potential Savings */}
        <View className="bg-surface rounded-2xl p-5 border border-border mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-foreground">Potential Savings</Text>
            {!isPro && (
              <View className="bg-primary/10 px-2.5 py-1 rounded-full flex-row items-center gap-1">
                <IconSymbol name="lock.fill" size={10} color={colors.primary} />
                <Text className="text-[10px] font-bold text-primary">PRO</Text>
              </View>
            )}
          </View>
          {isPro ? (
            <View className="items-center py-4">
              <Text className="text-4xl font-bold text-success">
                ${analytics?.potentialSavings?.toFixed(2) ?? "0.00"}
              </Text>
              <Text className="text-sm text-muted mt-1">estimated monthly savings</Text>
              {discountSavings.total > 0 && (
                <View className="flex-row items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full" style={{ backgroundColor: colors.success + "10" }}>
                  <IconSymbol name="tag.fill" size={12} color={colors.success} />
                  <Text className="text-xs font-medium" style={{ color: colors.success }}>
                    Already saving ${discountSavings.total.toFixed(2)}/mo with discounts
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View className="items-center py-4">
              <View className="w-14 h-14 rounded-2xl bg-primary/10 items-center justify-center mb-3">
                <IconSymbol name="crown.fill" size={28} color={colors.primary} />
              </View>
              <Text className="text-sm text-muted text-center">
                Upgrade to Pro to see personalized savings insights
              </Text>
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/pricing" as any);
                }}
                style={({ pressed }) => [
                  {
                    backgroundColor: colors.primary,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 12,
                    marginTop: 12,
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <Text className="text-white text-sm font-semibold">Upgrade to Pro</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Export Button */}
        <Pressable
          onPress={async () => {
            if (!isPro) {
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              router.push("/pricing" as any);
              return;
            }
            // Build report text
            const lines: string[] = [];
            lines.push("SubZero Spending Report");
            lines.push(`Generated: ${new Date().toLocaleDateString()}`);
            lines.push("");
            lines.push(`Monthly Spend: $${analytics?.totalMonthly?.toFixed(2) ?? "0.00"}`);
            lines.push(`Yearly Estimate: $${analytics?.totalYearly?.toFixed(2) ?? "0.00"}`);
            lines.push(`Total Savings: $${analytics?.totalSavings?.toFixed(2) ?? "0.00"}`);
            lines.push("");
            lines.push("--- Top Subscriptions ---");
            (analytics?.topSubscriptions ?? []).forEach((s: any, i: number) => {
              lines.push(`${i + 1}. ${s.name} — $${s.amount.toFixed(2)}/${s.billingCycle}`);
            });
            lines.push("");
            lines.push("--- Category Breakdown ---");
            (analytics?.categoryBreakdown ?? []).forEach((c: any) => {
              lines.push(`${c.category}: $${c.amount.toFixed(2)}/mo (${c.count} subs)`);
            });
            const report = lines.join("\n");
            try {
              await Clipboard.setStringAsync(report);
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              if (Platform.OS === "web") {
                alert("Report copied to clipboard!");
              } else {
                const { Alert: RNAlert } = require("react-native");
                RNAlert.alert("Copied!", "Spending report copied to clipboard. Paste it anywhere to share.");
              }
            } catch {
              if (Platform.OS === "web") {
                alert("Failed to copy report.");
              } else {
                const { Alert: RNAlert } = require("react-native");
                RNAlert.alert("Error", "Failed to copy report to clipboard.");
              }
            }
          }}
          style={({ pressed }) => [
            {
              backgroundColor: isPro ? colors.primary + "10" : colors.surface,
              borderWidth: 1,
              borderColor: isPro ? colors.primary + "30" : colors.border,
              paddingVertical: 16,
              borderRadius: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          {!isPro && <IconSymbol name="lock.fill" size={14} color={colors.muted} />}
          <IconSymbol name="doc.text.fill" size={18} color={isPro ? colors.primary : colors.muted} />
          <Text
            className="text-sm font-semibold"
            style={{ color: isPro ? colors.primary : colors.muted }}
          >
            Export Report
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
