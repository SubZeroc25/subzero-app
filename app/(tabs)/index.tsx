import { ScrollView, Text, View, Pressable, Platform, ActivityIndicator, RefreshControl } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import { useState, useCallback, useMemo } from "react";

export default function DashboardScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const profileQuery = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const analyticsQuery = trpc.analytics.spending.useQuery(undefined, { enabled: isAuthenticated });
  const renewalsQuery = trpc.subscriptions.upcomingRenewals.useQuery(undefined, { enabled: isAuthenticated });
  const activeQuery = trpc.subscriptions.active.useQuery(undefined, { enabled: isAuthenticated });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([
      profileQuery.refetch(),
      analyticsQuery.refetch(),
      renewalsQuery.refetch(),
      activeQuery.refetch(),
    ]);
    setRefreshing(false);
  }, []);

  // Compute total discount savings from active subscriptions
  const totalSavings = useMemo(() => {
    const subs = activeQuery.data ?? [];
    return subs.reduce((acc, sub) => {
      const discount = sub.discountAmount ? Number(sub.discountAmount) : 0;
      return acc + discount;
    }, 0);
  }, [activeQuery.data]);

  // Redirect unauthenticated users
  if (!authLoading && !isAuthenticated) {
    return (
      <ScreenContainer className="px-6">
        <View className="flex-1 items-center justify-center">
          <View className="w-24 h-24 rounded-3xl bg-primary items-center justify-center mb-6">
            <IconSymbol name="bolt.fill" size={48} color="#FFFFFF" />
          </View>
          <Text className="text-3xl font-bold text-foreground mb-2">SubZero</Text>
          <Text className="text-base text-muted text-center mb-2">
            Track every subscription.
          </Text>
          <Text className="text-base text-muted text-center mb-8">
            Save every dollar.
          </Text>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/auth" as any);
            }}
            style={({ pressed }) => [
              {
                backgroundColor: colors.primary,
                paddingVertical: 16,
                paddingHorizontal: 40,
                borderRadius: 16,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <Text className="text-white text-base font-bold">Sign In to Get Started</Text>
          </Pressable>
          <View className="flex-row items-center gap-2 mt-6">
            <IconSymbol name="shield.fill" size={14} color={colors.muted} />
            <Text className="text-xs text-muted">Your data stays private and secure</Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (authLoading) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-sm text-muted mt-3">Loading your dashboard...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const analytics = analyticsQuery.data;
  const renewals = renewalsQuery.data ?? [];
  const activeCount = activeQuery.data?.length ?? 0;
  const profile = profileQuery.data;
  const isPro = profile?.plan === "pro";
  const isLoading = analyticsQuery.isLoading || renewalsQuery.isLoading || activeQuery.isLoading;

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

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
        <View className="flex-row items-center justify-between pt-4 mb-5">
          <View>
            <Text className="text-sm text-muted">{greeting},</Text>
            <Text className="text-2xl font-bold text-foreground">
              {user?.name?.split(" ")[0] || "User"}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            {isPro && (
              <View className="bg-primary/10 px-3 py-1.5 rounded-full flex-row items-center gap-1.5">
                <IconSymbol name="crown.fill" size={14} color={colors.primary} />
                <Text className="text-xs font-bold text-primary">PRO</Text>
              </View>
            )}
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/scan" as any);
              }}
              style={({ pressed }) => [
                {
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.primary + "15",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <IconSymbol name="envelope.fill" size={18} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* Monthly Spending Hero Card */}
        <View className="bg-primary rounded-3xl p-6 mb-4 overflow-hidden">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-white/70 text-sm font-medium">Monthly Spending</Text>
            <View className="bg-white/15 px-3 py-1 rounded-full">
              <Text className="text-white text-xs font-semibold">
                {activeCount} active
              </Text>
            </View>
          </View>
          <Text className="text-white text-5xl font-bold mb-1">
            ${analytics?.totalMonthly?.toFixed(2) ?? "0.00"}
          </Text>
          <View className="flex-row items-center gap-4 mt-2">
            <View className="flex-row items-center gap-1.5">
              <IconSymbol name="calendar" size={12} color="rgba(255,255,255,0.6)" />
              <Text className="text-white/60 text-xs">
                ${analytics?.totalYearly?.toFixed(2) ?? "0.00"}/year
              </Text>
            </View>
            {totalSavings > 0 && (
              <View className="flex-row items-center gap-1.5">
                <IconSymbol name="tag.fill" size={12} color="rgba(255,255,255,0.6)" />
                <Text className="text-white/60 text-xs">
                  ${totalSavings.toFixed(2)} saved
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Stats Row */}
        <View className="flex-row gap-3 mb-4">
          <Pressable
            onPress={() => router.push("/(tabs)/analytics" as any)}
            style={({ pressed }) => [
              {
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center mb-3">
              <IconSymbol name="chart.bar.fill" size={18} color={colors.primary} />
            </View>
            <Text className="text-2xl font-bold text-foreground">
              {analytics?.categoryBreakdown?.length ?? 0}
            </Text>
            <Text className="text-xs text-muted mt-0.5">Categories</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/(tabs)/subscriptions" as any)}
            style={({ pressed }) => [
              {
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: colors.warning + "15" }}>
              <IconSymbol name="bell.fill" size={18} color={colors.warning} />
            </View>
            <Text className="text-2xl font-bold text-foreground mt-3">
              {renewals.length}
            </Text>
            <Text className="text-xs text-muted mt-0.5">Upcoming</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/(tabs)/analytics" as any)}
            style={({ pressed }) => [
              {
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: colors.success + "15" }}>
              <IconSymbol name="bolt.fill" size={18} color={colors.success} />
            </View>
            <Text className="text-2xl font-bold text-foreground mt-3">
              ${analytics?.potentialSavings?.toFixed(0) ?? "0"}
            </Text>
            <Text className="text-xs text-muted mt-0.5">Can Save</Text>
          </Pressable>
        </View>

        {/* Spending Trend */}
        {analytics?.monthlyTrend && analytics.monthlyTrend.length > 0 && (
          <View className="bg-surface rounded-2xl p-5 border border-border mb-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-foreground">Spending Trend</Text>
              <Text className="text-xs text-muted">Last {analytics.monthlyTrend.length} months</Text>
            </View>
            <View className="flex-row items-end justify-between" style={{ height: 100 }}>
              {analytics.monthlyTrend.map((m, i) => {
                const maxAmount = Math.max(...analytics.monthlyTrend.map((t) => t.amount), 1);
                const height = Math.max((m.amount / maxAmount) * 80, 6);
                const isLast = i === analytics.monthlyTrend.length - 1;
                return (
                  <View key={i} className="items-center flex-1 gap-1">
                    <Text className="text-[8px] text-muted">
                      {m.amount > 0 ? `$${m.amount.toFixed(0)}` : ""}
                    </Text>
                    <View
                      style={{
                        height,
                        backgroundColor: isLast ? colors.primary : colors.primary + "35",
                        borderRadius: 6,
                        width: "55%",
                      }}
                    />
                    <Text className="text-[10px] text-muted">{m.month}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Upcoming Renewals */}
        <View className="bg-surface rounded-2xl p-5 border border-border mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base font-semibold text-foreground">Upcoming Renewals</Text>
            <Text className="text-xs text-muted">Next 7 days</Text>
          </View>
          {isLoading ? (
            <View className="py-6 items-center">
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : renewals.length === 0 ? (
            <View className="py-6 items-center">
              <View className="w-12 h-12 rounded-2xl items-center justify-center mb-3" style={{ backgroundColor: colors.success + "10" }}>
                <IconSymbol name="checkmark" size={24} color={colors.success} />
              </View>
              <Text className="text-sm font-medium text-foreground mb-1">All clear!</Text>
              <Text className="text-xs text-muted text-center">
                No renewals coming up this week
              </Text>
            </View>
          ) : (
            renewals.slice(0, 5).map((sub, i) => (
              <Pressable
                key={i}
                onPress={() => router.push({ pathname: "/edit-subscription" as any, params: { id: String(sub.id) } })}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 12,
                    borderBottomWidth: i < Math.min(renewals.length, 5) - 1 ? 0.5 : 0,
                    borderBottomColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
                    <Text className="text-sm font-bold text-primary">
                      {sub.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-sm font-medium text-foreground">{sub.name}</Text>
                    <Text className="text-xs text-muted">
                      {sub.nextRenewalDate
                        ? new Date(sub.nextRenewalDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        : "No date set"}
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-sm font-semibold text-foreground">
                    ${Number(sub.amount).toFixed(2)}
                  </Text>
                  {sub.discountAmount && Number(sub.discountAmount) > 0 && (
                    <View className="flex-row items-center gap-1 mt-0.5">
                      <IconSymbol name="tag.fill" size={8} color={colors.success} />
                      <Text className="text-[10px] font-medium" style={{ color: colors.success }}>
                        -${Number(sub.discountAmount).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ))
          )}
        </View>

        {/* Scan CTA */}
        {activeCount === 0 && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/scan" as any);
            }}
            style={({ pressed }) => [
              {
                backgroundColor: colors.primary + "08",
                borderWidth: 1.5,
                borderColor: colors.primary + "30",
                borderStyle: "dashed",
                paddingVertical: 20,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center mb-1">
              <IconSymbol name="envelope.fill" size={22} color={colors.primary} />
            </View>
            <Text className="text-primary text-base font-semibold">Scan Your Inbox</Text>
            <Text className="text-xs text-muted text-center px-8">
              Connect your email to automatically detect subscriptions
            </Text>
          </Pressable>
        )}

        {/* Pro Upgrade Banner */}
        {!isPro && activeCount > 0 && (
          <Pressable
            onPress={() => router.push("/pricing" as any)}
            style={({ pressed }) => [
              {
                backgroundColor: colors.primary + "08",
                borderRadius: 16,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                marginTop: 4,
                borderWidth: 1,
                borderColor: colors.primary + "20",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View className="w-10 h-10 rounded-xl bg-primary/15 items-center justify-center">
              <IconSymbol name="crown.fill" size={20} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">Unlock Pro Features</Text>
              <Text className="text-xs text-muted mt-0.5">
                Unlimited scans, full analytics, and more
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </Pressable>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
