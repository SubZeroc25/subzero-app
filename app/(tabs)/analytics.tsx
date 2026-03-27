import { ScrollView, Text, View, Pressable, Platform, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";

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

export default function AnalyticsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isAuthenticated } = useAuth();

  const analyticsQuery = trpc.analytics.spending.useQuery(undefined, { enabled: isAuthenticated });
  const profileQuery = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });

  const analytics = analyticsQuery.data;
  const isPro = profileQuery.data?.plan === "pro";

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="px-6">
        <View className="flex-1 items-center justify-center">
          <IconSymbol name="lock.fill" size={48} color={colors.muted} />
          <Text className="text-lg font-semibold text-foreground mt-4">Sign in Required</Text>
          <Text className="text-sm text-muted text-center mt-2">Sign in to view analytics</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (analyticsQuery.isLoading) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="pt-4 mb-6">
          <Text className="text-2xl font-bold text-foreground">Analytics</Text>
          <Text className="text-sm text-muted mt-1">Your spending insights</Text>
        </View>

        {/* Spending Cards */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-primary rounded-2xl p-4">
            <Text className="text-white/70 text-xs font-medium">Monthly</Text>
            <Text className="text-white text-2xl font-bold mt-1">
              ${analytics?.totalMonthly?.toFixed(2) ?? "0.00"}
            </Text>
          </View>
          <View className="flex-1 bg-surface rounded-2xl p-4 border border-border">
            <Text className="text-muted text-xs font-medium">Yearly</Text>
            <Text className="text-foreground text-2xl font-bold mt-1">
              ${analytics?.totalYearly?.toFixed(2) ?? "0.00"}
            </Text>
          </View>
        </View>

        {/* Category Breakdown */}
        <View className="bg-surface rounded-2xl p-5 border border-border mb-4">
          <Text className="text-base font-semibold text-foreground mb-4">Category Breakdown</Text>
          {!analytics?.categoryBreakdown?.length ? (
            <Text className="text-sm text-muted text-center py-4">
              No data yet. Scan your inbox to see category breakdown.
            </Text>
          ) : (
            <>
              {/* Visual bars */}
              <View className="gap-3 mb-4">
                {analytics.categoryBreakdown.map((cat, i) => {
                  const maxAmount = Math.max(...analytics.categoryBreakdown.map((c) => c.amount), 1);
                  const width = Math.max((cat.amount / maxAmount) * 100, 5);
                  const catColor = CATEGORY_COLORS[cat.category] || CATEGORY_COLORS.other;
                  return (
                    <View key={i}>
                      <View className="flex-row items-center justify-between mb-1">
                        <View className="flex-row items-center gap-2">
                          <View className="w-3 h-3 rounded-full" style={{ backgroundColor: catColor }} />
                          <Text className="text-sm text-foreground capitalize">{cat.category}</Text>
                        </View>
                        <Text className="text-sm font-medium text-foreground">
                          ${cat.amount.toFixed(2)}/mo
                        </Text>
                      </View>
                      <View className="h-2 bg-border rounded-full overflow-hidden">
                        <View
                          className="h-full rounded-full"
                          style={{ width: `${width}%`, backgroundColor: catColor }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
              {/* Legend */}
              <View className="flex-row flex-wrap gap-x-4 gap-y-2 pt-3 border-t border-border">
                {analytics.categoryBreakdown.map((cat, i) => (
                  <View key={i} className="flex-row items-center gap-1.5">
                    <View
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[cat.category] || CATEGORY_COLORS.other }}
                    />
                    <Text className="text-xs text-muted capitalize">
                      {cat.category} ({cat.count})
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Monthly Trend */}
        <View className="bg-surface rounded-2xl p-5 border border-border mb-4">
          <Text className="text-base font-semibold text-foreground mb-4">Monthly Trend</Text>
          {!analytics?.monthlyTrend?.length ? (
            <Text className="text-sm text-muted text-center py-4">No trend data available</Text>
          ) : (
            <View className="flex-row items-end justify-between h-32">
              {analytics.monthlyTrend.map((m, i) => {
                const maxAmount = Math.max(...analytics.monthlyTrend.map((t) => t.amount), 1);
                const height = Math.max((m.amount / maxAmount) * 100, 4);
                const isLast = i === analytics.monthlyTrend.length - 1;
                return (
                  <View key={i} className="items-center flex-1 gap-1">
                    <Text className="text-[9px] text-muted">${m.amount.toFixed(0)}</Text>
                    <View
                      style={{
                        height,
                        backgroundColor: isLast ? colors.primary : colors.primary + "40",
                        borderRadius: 4,
                        width: "55%",
                      }}
                    />
                    <Text className="text-[10px] text-muted">{m.month}</Text>
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
            <Text className="text-sm text-muted text-center py-4">No subscriptions found</Text>
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
                  <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
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

        {/* Potential Savings (Pro Feature) */}
        <View className="bg-surface rounded-2xl p-5 border border-border mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-foreground">Potential Savings</Text>
            {!isPro && (
              <View className="bg-primary/10 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                <IconSymbol name="lock.fill" size={10} color={colors.primary} />
                <Text className="text-[10px] font-semibold text-primary">PRO</Text>
              </View>
            )}
          </View>
          {isPro ? (
            <View className="items-center py-4">
              <Text className="text-3xl font-bold text-success">
                ${analytics?.potentialSavings?.toFixed(2) ?? "0.00"}
              </Text>
              <Text className="text-sm text-muted mt-1">estimated monthly savings</Text>
            </View>
          ) : (
            <View className="items-center py-4">
              <IconSymbol name="crown.fill" size={32} color={colors.primary} />
              <Text className="text-sm text-muted text-center mt-2">
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
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 10,
                    marginTop: 12,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text className="text-white text-sm font-semibold">Upgrade to Pro</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Export (Pro Feature) */}
        <Pressable
          onPress={() => {
            if (!isPro) {
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              router.push("/pricing" as any);
            } else {
              if (Platform.OS === "web") alert("Export feature coming soon!");
              else {
                const { Alert: RNAlert } = require("react-native");
                RNAlert.alert("Coming Soon", "Export feature will be available in the next update.");
              }
            }
          }}
          style={({ pressed }) => [
            {
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              paddingVertical: 14,
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
            className="text-sm font-medium"
            style={{ color: isPro ? colors.primary : colors.muted }}
          >
            Export Report
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
