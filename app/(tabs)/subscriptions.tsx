import {
  Text, View, Pressable, Platform, FlatList, TextInput, ActivityIndicator, Alert,
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

  const subsQuery = trpc.subscriptions.list.useQuery(undefined, { enabled: isAuthenticated });
  const deleteMutation = trpc.subscriptions.delete.useMutation({
    onSuccess: () => subsQuery.refetch(),
  });
  const updateMutation = trpc.subscriptions.update.useMutation({
    onSuccess: () => subsQuery.refetch(),
  });

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

  const filters: { label: string; value: FilterType }[] = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Cancelled", value: "cancelled" },
    { label: "Trial", value: "trial" },
  ];

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="px-6">
        <View className="flex-1 items-center justify-center">
          <IconSymbol name="lock.fill" size={48} color={colors.muted} />
          <Text className="text-lg font-semibold text-foreground mt-4">Sign in Required</Text>
          <Text className="text-sm text-muted text-center mt-2">
            Sign in to view your subscriptions
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5">
      {/* Header */}
      <View className="pt-4 mb-4">
        <Text className="text-2xl font-bold text-foreground">Subscriptions</Text>
        <Text className="text-sm text-muted mt-1">
          {filteredSubs.length} subscription{filteredSubs.length !== 1 ? "s" : ""}
        </Text>
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
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text
              className="text-xs font-medium"
              style={{ color: filter === f.value ? "#FFFFFF" : colors.foreground }}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* List */}
      {subsQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredSubs}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <IconSymbol name="rectangle.stack.fill" size={48} color={colors.muted} />
              <Text className="text-lg font-semibold text-foreground mt-4">No Subscriptions</Text>
              <Text className="text-sm text-muted text-center mt-2 px-8">
                {search || filter !== "all"
                  ? "No subscriptions match your search or filter."
                  : "Scan your inbox to detect subscriptions automatically."}
              </Text>
              {!search && filter === "all" && (
                <Pressable
                  onPress={() => router.push("/scan" as any)}
                  style={({ pressed }) => [
                    {
                      backgroundColor: colors.primary,
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 12,
                      marginTop: 16,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text className="text-white text-sm font-semibold">Scan Inbox</Text>
                </Pressable>
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
