import { useState, useCallback } from "react";
import { ScrollView, Text, View, TouchableOpacity, TextInput, Alert, Platform, RefreshControl, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type TabId = "overview" | "users" | "promos";

export default function AdminScreen() {
  const colors = useColors();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [refreshing, setRefreshing] = useState(false);

  const statsQuery = trpc.admin.stats.useQuery(undefined, { retry: false });
  const usersQuery = trpc.admin.users.useQuery(undefined, { retry: false });
  const promosQuery = trpc.admin.promoCodes.list.useQuery(undefined, { retry: false });

  const setUserPlan = trpc.admin.setUserPlan.useMutation();
  const setUserRole = trpc.admin.setUserRole.useMutation();
  const createPromo = trpc.admin.promoCodes.create.useMutation();
  const deactivatePromo = trpc.admin.promoCodes.deactivate.useMutation();

  // Promo form state
  const [promoCode, setPromoCode] = useState("");
  const [promoDesc, setPromoDesc] = useState("");
  const [promoType, setPromoType] = useState<"pro_upgrade" | "discount">("pro_upgrade");
  const [promoDiscount, setPromoDiscount] = useState("");
  const [promoMaxUses, setPromoMaxUses] = useState("1");
  const [showPromoForm, setShowPromoForm] = useState(false);

  const isError = statsQuery.isError || usersQuery.isError;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([statsQuery.refetch(), usersQuery.refetch(), promosQuery.refetch()]);
    setRefreshing(false);
  }, []);

  if (isError) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="p-6">
        <View className="flex-1 items-center justify-center gap-4">
          <IconSymbol name="shield.fill" size={48} color={colors.error} />
          <Text className="text-xl font-bold text-foreground">Access Denied</Text>
          <Text className="text-muted text-center">You do not have admin privileges.</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="bg-primary px-6 py-3 rounded-xl mt-4"
          >
            <Text className="text-background font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const stats = statsQuery.data;

  const handleTogglePlan = async (userId: number, currentPlan: string) => {
    const newPlan = currentPlan === "pro" ? "free" : "pro";
    const msg = `Set this user to ${newPlan.toUpperCase()} plan?`;
    if (Platform.OS === "web") {
      if (!confirm(msg)) return;
    } else {
      await new Promise<void>((resolve, reject) => {
        Alert.alert("Confirm", msg, [
          { text: "Cancel", onPress: reject },
          { text: "Confirm", onPress: () => resolve() },
        ]);
      }).catch(() => { return; });
    }
    await setUserPlan.mutateAsync({ userId, plan: newPlan as "free" | "pro" });
    usersQuery.refetch();
    statsQuery.refetch();
  };

  const handleToggleRole = async (userId: number, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    const msg = `Set this user to ${newRole.toUpperCase()} role?`;
    if (Platform.OS === "web") {
      if (!confirm(msg)) return;
    } else {
      await new Promise<void>((resolve, reject) => {
        Alert.alert("Confirm", msg, [
          { text: "Cancel", onPress: reject },
          { text: "Confirm", onPress: () => resolve() },
        ]);
      }).catch(() => { return; });
    }
    await setUserRole.mutateAsync({ userId, role: newRole as "user" | "admin" });
    usersQuery.refetch();
  };

  const handleCreatePromo = async () => {
    if (!promoCode.trim()) return;
    try {
      await createPromo.mutateAsync({
        code: promoCode.trim(),
        description: promoDesc.trim() || undefined,
        type: promoType,
        discountPercent: promoType === "discount" ? Number(promoDiscount) || 10 : null,
        maxUses: Number(promoMaxUses) || 1,
      });
      setPromoCode("");
      setPromoDesc("");
      setPromoDiscount("");
      setPromoMaxUses("1");
      setShowPromoForm(false);
      promosQuery.refetch();
    } catch (e: any) {
      const msg = e?.message || "Failed to create promo code";
      Platform.OS === "web" ? alert(msg) : Alert.alert("Error", msg);
    }
  };

  const handleDeactivatePromo = async (id: number) => {
    await deactivatePromo.mutateAsync({ id });
    promosQuery.refetch();
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "users", label: "Users" },
    { id: "promos", label: "Promos" },
  ];

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="p-0">
      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-foreground">Admin Panel</Text>
        <TouchableOpacity onPress={onRefresh} activeOpacity={0.7}>
          <IconSymbol name="arrow.clockwise" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View className="flex-row px-5 mb-4 gap-2">
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 rounded-xl items-center ${activeTab === tab.id ? "bg-primary" : "bg-surface"}`}
            activeOpacity={0.8}
          >
            <Text className={`font-semibold text-sm ${activeTab === tab.id ? "text-background" : "text-muted"}`}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {activeTab === "overview" && stats && (
          <View className="gap-4">
            {/* Stats Grid */}
            <View className="flex-row flex-wrap gap-3">
              <StatCard label="Total Users" value={String(stats.totalUsers)} icon="person.fill" color={colors.primary} bgColor={colors.surface} textColor={colors.foreground} mutedColor={colors.muted} />
              <StatCard label="Pro Users" value={String(stats.proUsers)} icon="crown.fill" color="#F59E0B" bgColor={colors.surface} textColor={colors.foreground} mutedColor={colors.muted} />
              <StatCard label="Subscriptions" value={String(stats.totalSubscriptions)} icon="creditcard.fill" color={colors.success} bgColor={colors.surface} textColor={colors.foreground} mutedColor={colors.muted} />
              <StatCard label="Active" value={String(stats.activeSubscriptions)} icon="checkmark" color="#22C55E" bgColor={colors.surface} textColor={colors.foreground} mutedColor={colors.muted} />
              <StatCard label="Total Scans" value={String(stats.totalScans)} icon="magnifyingglass" color="#8B5CF6" bgColor={colors.surface} textColor={colors.foreground} mutedColor={colors.muted} />
              <StatCard label="Promo Codes" value={String(stats.activePromoCodes)} icon="gift.fill" color="#EC4899" bgColor={colors.surface} textColor={colors.foreground} mutedColor={colors.muted} />
            </View>

            {/* Revenue Card */}
            <View className="bg-surface rounded-2xl p-5 border border-border">
              <Text className="text-muted text-sm mb-1">Monthly Revenue Tracked</Text>
              <Text className="text-3xl font-bold text-foreground">${stats.totalMonthlyTracked.toLocaleString()}</Text>
              <Text className="text-muted text-xs mt-1">Across all users' active subscriptions</Text>
            </View>
          </View>
        )}

        {activeTab === "users" && (
          <View className="gap-3">
            {(usersQuery.data || []).map((user) => (
              <View key={user.id} className="bg-surface rounded-2xl p-4 border border-border">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1">
                    <Text className="text-foreground font-semibold text-base" numberOfLines={1}>
                      {user.name || "Unnamed User"}
                    </Text>
                    <Text className="text-muted text-xs" numberOfLines={1}>{user.email || "No email"}</Text>
                  </View>
                  <View className="flex-row gap-1">
                    <View className={`px-2 py-1 rounded-lg ${user.role === "admin" ? "bg-error/20" : "bg-primary/20"}`}>
                      <Text className={`text-xs font-semibold ${user.role === "admin" ? "text-error" : "text-primary"}`}>
                        {user.role?.toUpperCase()}
                      </Text>
                    </View>
                    <View className={`px-2 py-1 rounded-lg ${user.profile?.plan === "pro" ? "bg-warning/20" : "bg-muted/20"}`}>
                      <Text className={`text-xs font-semibold ${user.profile?.plan === "pro" ? "text-warning" : "text-muted"}`}>
                        {(user.profile?.plan || "free").toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="flex-row gap-2 mt-2">
                  <TouchableOpacity
                    onPress={() => handleTogglePlan(user.id, user.profile?.plan || "free")}
                    className="flex-1 py-2 rounded-xl bg-primary/10 items-center"
                    activeOpacity={0.7}
                  >
                    <Text className="text-primary text-xs font-semibold">
                      {user.profile?.plan === "pro" ? "Downgrade" : "Upgrade to Pro"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleToggleRole(user.id, user.role || "user")}
                    className="flex-1 py-2 rounded-xl bg-error/10 items-center"
                    activeOpacity={0.7}
                  >
                    <Text className="text-error text-xs font-semibold">
                      {user.role === "admin" ? "Remove Admin" : "Make Admin"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text className="text-muted text-xs mt-2">
                  Joined: {new Date(user.createdAt).toLocaleDateString()} · Scans: {user.profile?.scansThisMonth ?? 0}
                </Text>
              </View>
            ))}
            {(!usersQuery.data || usersQuery.data.length === 0) && (
              <Text className="text-muted text-center py-8">No users found</Text>
            )}
          </View>
        )}

        {activeTab === "promos" && (
          <View className="gap-4">
            {/* Create Promo Button */}
            {!showPromoForm ? (
              <TouchableOpacity
                onPress={() => setShowPromoForm(true)}
                className="bg-primary rounded-2xl py-3.5 items-center flex-row justify-center gap-2"
                activeOpacity={0.8}
              >
                <IconSymbol name="plus" size={20} color={colors.background} />
                <Text className="text-background font-semibold">Create Promo Code</Text>
              </TouchableOpacity>
            ) : (
              <View className="bg-surface rounded-2xl p-4 border border-border gap-3">
                <Text className="text-foreground font-semibold text-base">New Promo Code</Text>

                <TextInput
                  value={promoCode}
                  onChangeText={(t) => setPromoCode(t.toUpperCase())}
                  placeholder="CODE (e.g. LAUNCH50)"
                  placeholderTextColor={colors.muted}
                  className="bg-background rounded-xl px-4 py-3 text-foreground border border-border"
                  autoCapitalize="characters"
                />

                <TextInput
                  value={promoDesc}
                  onChangeText={setPromoDesc}
                  placeholder="Description (optional)"
                  placeholderTextColor={colors.muted}
                  className="bg-background rounded-xl px-4 py-3 text-foreground border border-border"
                />

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setPromoType("pro_upgrade")}
                    className={`flex-1 py-2.5 rounded-xl items-center ${promoType === "pro_upgrade" ? "bg-primary" : "bg-background border border-border"}`}
                    activeOpacity={0.8}
                  >
                    <Text className={`text-sm font-semibold ${promoType === "pro_upgrade" ? "text-background" : "text-muted"}`}>
                      Pro Upgrade
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setPromoType("discount")}
                    className={`flex-1 py-2.5 rounded-xl items-center ${promoType === "discount" ? "bg-primary" : "bg-background border border-border"}`}
                    activeOpacity={0.7}
                  >
                    <Text className={`text-sm font-semibold ${promoType === "discount" ? "text-background" : "text-muted"}`}>
                      Discount
                    </Text>
                  </TouchableOpacity>
                </View>

                {promoType === "discount" && (
                  <TextInput
                    value={promoDiscount}
                    onChangeText={setPromoDiscount}
                    placeholder="Discount % (e.g. 20)"
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                    className="bg-background rounded-xl px-4 py-3 text-foreground border border-border"
                  />
                )}

                <TextInput
                  value={promoMaxUses}
                  onChangeText={setPromoMaxUses}
                  placeholder="Max uses (default: 1)"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  className="bg-background rounded-xl px-4 py-3 text-foreground border border-border"
                />

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setShowPromoForm(false)}
                    className="flex-1 py-3 rounded-xl bg-background border border-border items-center"
                    activeOpacity={0.7}
                  >
                    <Text className="text-muted font-semibold">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCreatePromo}
                    className="flex-1 py-3 rounded-xl bg-primary items-center"
                    activeOpacity={0.8}
                  >
                    <Text className="text-background font-semibold">Create</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Promo List */}
            {(promosQuery.data || []).map((promo) => (
              <View key={promo.id} className="bg-surface rounded-2xl p-4 border border-border">
                <View className="flex-row items-center justify-between mb-1">
                  <View className="flex-row items-center gap-2">
                    <View className="bg-primary/20 px-3 py-1 rounded-lg">
                      <Text className="text-primary font-bold text-sm">{promo.code}</Text>
                    </View>
                    <View className={`px-2 py-1 rounded-lg ${promo.isActive ? "bg-success/20" : "bg-error/20"}`}>
                      <Text className={`text-xs font-semibold ${promo.isActive ? "text-success" : "text-error"}`}>
                        {promo.isActive ? "Active" : "Inactive"}
                      </Text>
                    </View>
                  </View>
                  {promo.isActive && (
                    <TouchableOpacity
                      onPress={() => handleDeactivatePromo(promo.id)}
                      activeOpacity={0.7}
                    >
                      <IconSymbol name="xmark" size={18} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
                {promo.description && (
                  <Text className="text-muted text-sm mt-1">{promo.description}</Text>
                )}
                <Text className="text-muted text-xs mt-2">
                  Type: {promo.type === "pro_upgrade" ? "Pro Upgrade" : `${promo.discountPercent}% Discount`} · Used: {promo.usedCount}/{promo.maxUses}
                </Text>
              </View>
            ))}
            {(!promosQuery.data || promosQuery.data.length === 0) && !showPromoForm && (
              <Text className="text-muted text-center py-8">No promo codes yet</Text>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function StatCard({ label, value, icon, color, bgColor, textColor, mutedColor }: {
  label: string; value: string; icon: any; color: string; bgColor: string; textColor: string; mutedColor: string;
}) {
  return (
    <View className="bg-surface rounded-2xl p-4 border border-border" style={{ width: "48%" }}>
      <View className="flex-row items-center gap-2 mb-2">
        <View style={{ backgroundColor: color + "20", borderRadius: 8, padding: 6 }}>
          <IconSymbol name={icon} size={16} color={color} />
        </View>
      </View>
      <Text className="text-2xl font-bold text-foreground">{value}</Text>
      <Text className="text-muted text-xs mt-0.5">{label}</Text>
    </View>
  );
}
