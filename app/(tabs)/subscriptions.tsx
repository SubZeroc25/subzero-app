import {
  Text, View, Pressable, Platform, FlatList, TextInput, ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import { useState, useMemo, useCallback } from "react";
import { SubscriptionCard } from "@/components/subscription-card";

type FilterType = "all" | "active" | "cancelled" | "trial";

export default function SubscriptionsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [refreshing, setRefreshing] = useState(false);

  const subsQuery = trpc.subscriptions.list.useQuery(undefined, { enabled: isAuthenticated });
  const deleteMutation = trpc.subscriptions.delete.useMutation({
    onSuccess: () => subsQuery.refetch(),
  });
  const updateMutation = trpc.subscriptions.update.useMutation({
    onSuccess: () => subsQuery.refetch(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await subsQuery.refetch();
    setRefreshing(false);
  }, []);

  const filteredSubs = useMemo(() => {
    let list = subsQuery.data ?? [];
    if (filter !== "all") {
      list = list.filter((s) => s.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || s.provider.toLowerCase().includes(q)
      );
    }
    return list;
  }, [subsQuery.data, filter, search]);

  // Count by status
  const statusCounts = useMemo(() => {
    const all = subsQuery.data ?? [];
    return {
      all: all.length,
      active: all.filter((s) => s.status === "active").length,
      cancelled: all.filter((s) => s.status === "cancelled").length,
      trial: all.filter((s) => s.status === "trial").length,
    };
  }, [subsQuery.data]);

  // Total monthly spend
  const totalMonthly = useMemo(() => {
    const active = (subsQuery.data ?? []).filter((s) => s.status === "active" || s.status === "trial");
    return active.reduce((sum, s) => {
      const amt = Number(s.amount) || 0;
      const discount = Number(s.discountAmount) || 0;
      const effective = Math.max(amt - discount, 0);
      if (s.billingCycle === "yearly") return sum + effective / 12;
      return sum + effective;
    }, 0);
  }, [subsQuery.data]);

  const handleDelete = useCallback((id: number, name: string) => {
    const doDelete = () => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      deleteMutation.mutate({ id });
    };
    if (Platform.OS === "web") {
      if (confirm(`Remove ${name}?`)) doDelete();
    } else {
      Alert.alert("Remove Subscription", `Remove ${name} from your list?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: doDelete },
      ]);
    }
  }, []);

  const handleCancel = useCallback((id: number) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateMutation.mutate({ id, status: "cancelled" });
  }, []);

  const filters: { label: string; value: FilterType; count: number }[] = [
    { label: "All", value: "all", count: statusCounts.all },
    { label: "Active", value: "active", count: statusCounts.active },
    { label: "Cancelled", value: "cancelled", count: statusCounts.cancelled },
    { label: "Trial", value: "trial", count: statusCounts.trial },
  ];

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="px-6">
        <View className="flex-1 items-center justify-center">
          <View className="w-16 h-16 rounded-2xl items-center justify-center mb-4" style={{ backgroundColor: colors.muted + "15" }}>
            <IconSymbol name="lock.fill" size={32} color={colors.muted} />
          </View>
          <Text className="text-lg font-semibold text-foreground mt-2">Sign in Required</Text>
          <Text className="text-sm text-muted text-center mt-2">
            Sign in to view your subscriptions
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5">
      {/* Header with Add Button */}
      <View className="pt-4 mb-4 flex-row items-start justify-between">
        <View>
          <Text className="text-2xl font-bold text-foreground">Subscriptions</Text>
          <Text className="text-sm text-muted mt-1">
            {statusCounts.active} active · ${totalMonthly.toFixed(2)}/mo
          </Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/scan" as any);
            }}
            style={({ pressed }) => [{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              width: 40,
              height: 40,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            }]}
          >
            <IconSymbol name="magnifyingglass" size={18} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/edit-subscription?id=new" as any);
            }}
            style={({ pressed }) => [{
              backgroundColor: colors.primary,
              width: 40,
              height: 40,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            }]}
          >
            <IconSymbol name="plus" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Search */}
      <View className="bg-surface rounded-xl border border-border flex-row items-center px-3 mb-3">
        <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
        <TextInput
          className="flex-1 py-3 px-2 text-sm text-foreground"
          placeholder="Search subscriptions..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="done"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}>
            <IconSymbol name="xmark" size={16} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {/* Filters */}
      <View className="flex-row gap-2 mb-4">
        {filters.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter(f.value);
            }}
            style={({ pressed }) => [
              {
                backgroundColor: filter === f.value ? colors.primary : colors.surface,
                borderWidth: filter === f.value ? 0 : 1,
                borderColor: colors.border,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 20,
                opacity: pressed ? 0.8 : 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              },
            ]}
          >
            <Text
              className="text-xs font-medium"
              style={{ color: filter === f.value ? "#FFFFFF" : colors.foreground }}
            >
              {f.label}
            </Text>
            {f.count > 0 && (
              <View
                className="rounded-full px-1.5 py-0.5"
                style={{ backgroundColor: filter === f.value ? "rgba(255,255,255,0.2)" : colors.border }}
              >
                <Text
                  className="text-[9px] font-bold"
                  style={{ color: filter === f.value ? "#FFFFFF" : colors.muted }}
                >
                  {f.count}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* List */}
      {subsQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-sm text-muted mt-3">Loading subscriptions...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSubs}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <View className="w-16 h-16 rounded-2xl items-center justify-center mb-4" style={{ backgroundColor: colors.primary + "10" }}>
                <IconSymbol name="rectangle.stack.fill" size={32} color={colors.primary} />
              </View>
              <Text className="text-lg font-semibold text-foreground">
                {search || filter !== "all" ? "No Results" : "No Subscriptions"}
              </Text>
              <Text className="text-sm text-muted text-center mt-2 px-8">
                {search || filter !== "all"
                  ? "No subscriptions match your search or filter."
                  : "Scan your inbox or add a subscription manually."}
              </Text>
              {!search && filter === "all" && (
                <View className="flex-row gap-3 mt-5">
                  <Pressable
                    onPress={() => router.push("/scan" as any)}
                    style={({ pressed }) => [{
                      backgroundColor: colors.primary,
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      borderRadius: 12,
                      opacity: pressed ? 0.9 : 1,
                    }]}
                  >
                    <Text className="text-white text-sm font-semibold">Scan Inbox</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push("/edit-subscription?id=new" as any)}
                    style={({ pressed }) => [{
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      borderRadius: 12,
                      opacity: pressed ? 0.9 : 1,
                    }]}
                  >
                    <Text className="text-sm font-semibold text-foreground">Add Manually</Text>
                  </Pressable>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <SubscriptionCard
              item={item}
              onEdit={(id) => router.push(`/edit-subscription?id=${id}` as any)}
              onDelete={handleDelete}
              onCancel={handleCancel}
            />
          )}
        />
      )}
    </ScreenContainer>
  );
}
