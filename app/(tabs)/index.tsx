import { ScrollView, Text, View, Pressable, Platform, ActivityIndicator, RefreshControl } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import { useState, useCallback } from "react";

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
    await Promise.all([
      profileQuery.refetch(),
      analyticsQuery.refetch(),
      renewalsQuery.refetch(),
      activeQuery.refetch(),
    ]);
    setRefreshing(false);
  }, []);

  // Redirect unauthenticated users
  if (!authLoading && !isAuthenticated) {
    return (
      <ScreenContainer className="px-6">
        <View className="flex-1 items-center justify-center">
          <View className="w-20 h-20 rounded-2xl bg-primary items-center justify-center mb-6">
            <IconSymbol name="bolt.fill" size={40} color="#FFFFFF" />
          </View>
          <Text className="text-2xl font-bold text-foreground mb-2">SubZero</Text>
          <Text className="text-base text-muted text-center mb-8">
            Track every subscription.{"\n"}Save every dollar.
          </Text>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/auth" as any);
            }}
            style={({ pressed }) => [
              {
                backgroundColor: colors.primary,
                paddingVertical: 14,
                paddingHorizontal: 32,
                borderRadius: 14,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text className="text-white text-base font-semibold">Sign In to Get Started</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  if (authLoading) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  const analytics = analyticsQuery.data;
  const renewals = renewalsQuery.data ?? [];
  const activeCount = activeQuery.data?.length ?? 0;
  const profile = profileQuery.data;
  const isPro = profile?.plan === "pro";

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
        <View className="flex-row items-center justify-between pt-4 mb-6">
          <View>
            <Text className="text-sm text-muted">Welcome back,</Text>
            <Text className="text-2xl font-bold text-foreground">
              {user?.name?.split(" ")[0] || "User"}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            {isPro && (
              <View className="bg-primary/10 px-3 py-1 rounded-full flex-row items-center gap-1">
                <IconSymbol name="crown.fill" size={14} color={colors.primary} />
                <Text className="text-xs font-semibold text-primary">PRO</Text>
              </View>
            )}
          </View>
        </View>

        {/* Monthly Spending Card */}
        <View className="bg-primary rounded-2xl p-5 mb-4">
          <Text className="text-white/70 text-sm font-medium mb-1">Monthly Spending</Text>
          <Text className="text-white text-4xl font-bold mb-1">
            ${analytics?.totalMonthly?.toFixed(2) ?? "0.00"}
          </Text>
          <View className="flex-row items-center justify-between mt-2">
            <Text className="text-white/70 text-sm">
              ${analytics?.totalYearly?.toFixed(2) ?? "0.00"}/year
            </Text>
            <View className="bg-white/20 px-3 py-1 rounded-full">
              <Text className="text-white text-xs font-medium">
                {activeCount} active
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
            <IconSymbol name="chart.bar.fill" size={20} color={colors.primary} />
            <Text className="text-2xl font-bold text-foreground mt-2">
              {analytics?.categoryBreakdown?.length ?? 0}
            </Text>
            <Text className="text-xs text-muted">Categories</Text>
          </View>
          <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
            <IconSymbol name="bell.fill" size={20} color={colors.warning} />
            <Text className="text-2xl font-bold text-foreground mt-2">
              {renewals.length}
            </Text>
            <Text className="text-xs text-muted">Upcoming</Text>
          </View>
          <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
            <IconSymbol name="bolt.fill" size={20} color={colors.success} />
            <Text className="text-2xl font-bold text-foreground mt-2">
              ${analytics?.potentialSavings?.toFixed(0) ?? "0"}
            </Text>
            <Text className="text-xs text-muted">Savings</Text>
          </View>
        </View>

        {/* Spending Trend */}
        {analytics?.monthlyTrend && analytics.monthlyTrend.length > 0 && (
          <View className="bg-surface rounded-2xl p-5 border border-border mb-4">
            <Text className="text-base font-semibold text-foreground mb-4">Spending Trend</Text>
            <View className="flex-row items-end justify-between h-24">
              {analytics.monthlyTrend.map((m, i) => {
                const maxAmount = Math.max(...analytics.monthlyTrend.map((t) => t.amount), 1);
                const height = Math.max((m.amount / maxAmount) * 80, 4);
                const isLast = i === analytics.monthlyTrend.length - 1;
                return (
                  <View key={i} className="items-center flex-1">
                    <View
                      style={{
                        height,
                        backgroundColor: isLast ? colors.primary : colors.primary + "40",
                        borderRadius: 4,
                        width: "60%",
                      }}
                    />
                    <Text className="text-[10px] text-muted mt-1">{m.month}</Text>
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
          {renewals.length === 0 ? (
            <Text className="text-sm text-muted text-center py-4">
              No upcoming renewals this week
            </Text>
          ) : (
            renewals.slice(0, 5).map((sub, i) => (
              <View
                key={i}
                className="flex-row items-center justify-between py-3"
                style={i < renewals.length - 1 ? { borderBottomWidth: 0.5, borderBottomColor: colors.border } : {}}
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
                        : "No date"}
                    </Text>
                  </View>
                </View>
                <Text className="text-sm font-semibold text-foreground">
                  ${Number(sub.amount).toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Scan CTA */}
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/scan" as any);
          }}
          style={({ pressed }) => [
            {
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.primary,
              borderStyle: "dashed",
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
          <IconSymbol name="envelope.fill" size={20} color={colors.primary} />
          <Text className="text-primary text-base font-semibold">Scan Inbox for Subscriptions</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
