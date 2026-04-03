import { ScrollView, Text, View, Pressable, Platform, Switch, Alert, ActivityIndicator, TextInput } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useState, useCallback } from "react";
import Constants from "expo-constants";

const API_BASE = Constants.expoConfig?.extra?.apiBaseUrl
  || process.env.EXPO_PUBLIC_API_BASE_URL
  || "http://localhost:3000";

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, isAuthenticated, logout } = useAuth();

  const profileQuery = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const profileUpdate = trpc.profile.update.useMutation({
    onSuccess: () => profileQuery.refetch(),
  });
  const redeemPromo = trpc.profile.redeemPromo.useMutation();

  const profile = profileQuery.data;
  const isPro = profile?.plan === "pro";
  const isAdmin = (user as any)?.role === "admin" || (user as any)?.openId === process.env.EXPO_PUBLIC_OWNER_OPEN_ID;

  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoResult, setPromoResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showPromoInput, setShowPromoInput] = useState(false);

  const handleConnectEmail = useCallback(async (provider: "gmail" | "outlook") => {
    setConnectingProvider(provider);
    try {
      const headers: Record<string, string> = {};
      if (Platform.OS !== "web") {
        const { getSessionToken } = await import("@/lib/_core/auth");
        const token = await getSessionToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`${API_BASE}/api/email/${provider}/authorize`, {
        credentials: "include",
        headers,
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.configured === false) {
          Alert.alert(
            `${provider === "gmail" ? "Gmail" : "Outlook"} Not Configured`,
            `${provider === "gmail" ? "Gmail" : "Outlook"} OAuth credentials are not set up yet. Please add ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET in the Secrets panel.`,
          );
        } else {
          Alert.alert("Error", data.error || "Failed to start authorization");
        }
        return;
      }
      if (data.url) {
        if (Platform.OS !== "web") {
          const frontendUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/^(https?:\/\/)3000-/, "$18081-") || "http://localhost:8081";
          const result = await WebBrowser.openAuthSessionAsync(data.url, frontendUrl);
          console.log(`[Profile] ${provider} auth session result:`, result);
        } else {
          window.location.href = data.url;
          return;
        }
        profileQuery.refetch();
      }
    } catch (error) {
      console.error(`[Profile] Connect ${provider} failed:`, error);
      Alert.alert("Error", `Failed to connect ${provider === "gmail" ? "Gmail" : "Outlook"}`);
    } finally {
      setConnectingProvider(null);
    }
  }, [profileQuery]);

  const handleDisconnectEmail = useCallback(async (provider: "gmail" | "outlook") => {
    const providerName = provider === "gmail" ? "Gmail" : "Outlook";
    const doDisconnect = async () => {
      try {
        const headers: Record<string, string> = {};
        if (Platform.OS !== "web") {
          const { getSessionToken } = await import("@/lib/_core/auth");
          const token = await getSessionToken();
          if (token) headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE}/api/email/${provider}/disconnect`, {
          method: "POST",
          credentials: "include",
          headers,
        });
        if (response.ok) {
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          profileQuery.refetch();
        }
      } catch (error) {
        Alert.alert("Error", `Failed to disconnect ${providerName}`);
      }
    };
    if (Platform.OS === "web") {
      if (confirm(`Disconnect ${providerName}?`)) doDisconnect();
    } else {
      Alert.alert(`Disconnect ${providerName}`, `This will remove your ${providerName} connection. You can reconnect anytime.`, [
        { text: "Cancel", style: "cancel" },
        { text: "Disconnect", style: "destructive", onPress: doDisconnect },
      ]);
    }
  }, [profileQuery]);

  const handleUpgrade = useCallback(async () => {
    setBillingLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (Platform.OS !== "web") {
        const { getSessionToken } = await import("@/lib/_core/auth");
        const token = await getSessionToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`${API_BASE}/api/billing/checkout`, {
        method: "POST",
        headers,
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.configured === false) {
          router.push("/pricing" as any);
        } else {
          Alert.alert("Error", data.error || "Failed to start checkout");
        }
        return;
      }
      if (data.url) {
        await WebBrowser.openBrowserAsync(data.url);
        profileQuery.refetch();
      }
    } catch (error) {
      router.push("/pricing" as any);
    } finally {
      setBillingLoading(false);
    }
  }, [router, profileQuery]);

  const handleManageBilling = useCallback(async () => {
    setBillingLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (Platform.OS !== "web") {
        const { getSessionToken } = await import("@/lib/_core/auth");
        const token = await getSessionToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`${API_BASE}/api/billing/portal`, {
        method: "POST",
        headers,
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok && data.url) {
        await WebBrowser.openBrowserAsync(data.url);
        profileQuery.refetch();
      } else {
        Alert.alert("Info", "Billing portal is not available yet.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open billing portal");
    } finally {
      setBillingLoading(false);
    }
  }, [profileQuery]);

  const handleRedeemPromo = useCallback(async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoResult(null);
    try {
      const result = await redeemPromo.mutateAsync({ code: promoCode.trim() });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPromoResult({ type: "success", message: result.message });
      setPromoCode("");
      profileQuery.refetch();
    } catch (error: any) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPromoResult({ type: "error", message: error?.message || "Invalid promo code" });
    } finally {
      setPromoLoading(false);
    }
  }, [promoCode, redeemPromo, profileQuery]);

  const handleLogout = () => {
    const doLogout = () => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      logout();
    };
    if (Platform.OS === "web") {
      if (confirm("Sign out of SubZero?")) doLogout();
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="px-6">
        <View className="flex-1 items-center justify-center">
          <IconSymbol name="person.fill" size={48} color={colors.muted} />
          <Text className="text-lg font-semibold text-foreground mt-4">Sign in Required</Text>
          <Text className="text-sm text-muted text-center mt-2">Sign in to view your profile</Text>
          <Pressable
            onPress={() => router.push("/auth" as any)}
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
            <Text className="text-white text-sm font-semibold">Sign In</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="pt-4 mb-6">
          <Text className="text-2xl font-bold text-foreground">Profile</Text>
        </View>

        {/* User Info */}
        <View className="bg-surface rounded-2xl p-5 border border-border mb-4">
          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-2xl bg-primary items-center justify-center">
              <Text className="text-2xl font-bold text-white">
                {(user?.name || "U").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-foreground">{user?.name || "User"}</Text>
              <Text className="text-sm text-muted">{user?.email || "No email"}</Text>
              <View className="flex-row items-center gap-2 mt-1">
                <View
                  className="px-2.5 py-0.5 rounded-full flex-row items-center gap-1"
                  style={{ backgroundColor: isPro ? colors.primary + "15" : colors.muted + "15" }}
                >
                  {isPro && <IconSymbol name="crown.fill" size={10} color={colors.primary} />}
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: isPro ? colors.primary : colors.muted }}
                  >
                    {isPro ? "Pro" : "Free"} Plan
                  </Text>
                </View>
                {isAdmin && (
                  <View className="px-2.5 py-0.5 rounded-full" style={{ backgroundColor: colors.error + "15" }}>
                    <Text className="text-xs font-semibold" style={{ color: colors.error }}>Admin</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Admin Panel Link */}
        {isAdmin && (
          <Pressable
            onPress={() => router.push("/admin" as any)}
            style={({ pressed }) => [
              {
                backgroundColor: colors.error + "08",
                borderWidth: 1,
                borderColor: colors.error + "30",
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: colors.error + "15" }}>
              <IconSymbol name="gearshape.2.fill" size={20} color={colors.error} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">Admin Panel</Text>
              <Text className="text-xs text-muted">Manage users, promo codes, and analytics</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </Pressable>
        )}

        {/* Upgrade / Manage Billing */}
        {!isPro ? (
          <View className="mb-4">
            <Pressable
              onPress={handleUpgrade}
              disabled={billingLoading}
              style={({ pressed }) => [
                {
                  backgroundColor: colors.primary + "08",
                  borderWidth: 1,
                  borderColor: colors.primary + "30",
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
                <IconSymbol name="crown.fill" size={20} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">Upgrade to Pro</Text>
                <Text className="text-xs text-muted">Unlimited scans, full analytics, and more</Text>
              </View>
              {billingLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <IconSymbol name="chevron.right" size={16} color={colors.muted} />
              )}
            </Pressable>

            {/* Promo Code Section */}
            <Pressable
              onPress={() => {
                setShowPromoInput(!showPromoInput);
                setPromoResult(null);
              }}
              style={({ pressed }) => [
                {
                  marginTop: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  opacity: pressed ? 0.7 : 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                },
              ]}
            >
              <IconSymbol name="gift.fill" size={14} color={colors.primary} />
              <Text className="text-xs font-medium" style={{ color: colors.primary }}>
                {showPromoInput ? "Hide promo code" : "Have a promo code?"}
              </Text>
            </Pressable>

            {showPromoInput && (
              <View className="mt-1 px-1">
                <View className="flex-row gap-2">
                  <TextInput
                    value={promoCode}
                    onChangeText={(t) => { setPromoCode(t.toUpperCase()); setPromoResult(null); }}
                    placeholder="Enter code"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="characters"
                    returnKeyType="done"
                    onSubmitEditing={handleRedeemPromo}
                    className="flex-1 bg-surface rounded-xl px-4 py-3 text-foreground border border-border text-sm"
                  />
                  <Pressable
                    onPress={handleRedeemPromo}
                    disabled={promoLoading || !promoCode.trim()}
                    style={({ pressed }) => [
                      {
                        backgroundColor: promoCode.trim() ? colors.primary : colors.muted + "30",
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        justifyContent: "center",
                        alignItems: "center",
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    {promoLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text className="text-background text-sm font-semibold">Apply</Text>
                    )}
                  </Pressable>
                </View>
                {promoResult && (
                  <View
                    className="mt-2 px-3 py-2 rounded-lg"
                    style={{ backgroundColor: promoResult.type === "success" ? colors.success + "15" : colors.error + "15" }}
                  >
                    <Text
                      className="text-xs"
                      style={{ color: promoResult.type === "success" ? colors.success : colors.error }}
                    >
                      {promoResult.message}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          <Pressable
            onPress={handleManageBilling}
            disabled={billingLoading}
            style={({ pressed }) => [
              {
                backgroundColor: colors.success + "08",
                borderWidth: 1,
                borderColor: colors.success + "30",
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: colors.success + "15" }}>
              <IconSymbol name="crown.fill" size={20} color={colors.success} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">Pro Plan Active</Text>
              <Text className="text-xs text-muted">Manage billing and subscription</Text>
            </View>
            {billingLoading ? (
              <ActivityIndicator size="small" color={colors.success} />
            ) : (
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            )}
          </Pressable>
        )}

        {/* Connected Accounts */}
        <View className="bg-surface rounded-2xl border border-border mb-4 overflow-hidden">
          <View className="px-5 pt-4 pb-2">
            <Text className="text-sm font-semibold text-muted uppercase tracking-wide">
              Connected Accounts
            </Text>
          </View>

          {/* Gmail */}
          <View className="px-5 py-3 flex-row items-center justify-between border-b border-border">
            <View className="flex-row items-center gap-3 flex-1">
              <IconSymbol name="envelope.fill" size={20} color="#EA4335" />
              <View>
                <Text className="text-sm text-foreground">Gmail</Text>
                {profile?.connectedGmail && (
                  <Text className="text-xs text-success">Connected</Text>
                )}
              </View>
            </View>
            {connectingProvider === "gmail" ? (
              <ActivityIndicator size="small" color="#EA4335" />
            ) : profile?.connectedGmail ? (
              <Pressable
                onPress={() => handleDisconnectEmail("gmail")}
                style={({ pressed }) => [
                  {
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: colors.error + "15",
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text className="text-xs font-medium" style={{ color: colors.error }}>Disconnect</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => handleConnectEmail("gmail")}
                style={({ pressed }) => [
                  {
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: colors.primary + "15",
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text className="text-xs font-medium" style={{ color: colors.primary }}>Connect</Text>
              </Pressable>
            )}
          </View>

          {/* Outlook */}
          <View className="px-5 py-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <IconSymbol name="envelope.fill" size={20} color="#0078D4" />
              <View>
                <Text className="text-sm text-foreground">Outlook</Text>
                {profile?.connectedOutlook && (
                  <Text className="text-xs text-success">Connected</Text>
                )}
              </View>
            </View>
            {connectingProvider === "outlook" ? (
              <ActivityIndicator size="small" color="#0078D4" />
            ) : profile?.connectedOutlook ? (
              <Pressable
                onPress={() => handleDisconnectEmail("outlook")}
                style={({ pressed }) => [
                  {
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: colors.error + "15",
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text className="text-xs font-medium" style={{ color: colors.error }}>Disconnect</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => handleConnectEmail("outlook")}
                style={({ pressed }) => [
                  {
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: colors.primary + "15",
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text className="text-xs font-medium" style={{ color: colors.primary }}>Connect</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Settings */}
        <View className="bg-surface rounded-2xl border border-border mb-4 overflow-hidden">
          <View className="px-5 pt-4 pb-2">
            <Text className="text-sm font-semibold text-muted uppercase tracking-wide">Settings</Text>
          </View>

          <View className="px-5 py-3 flex-row items-center justify-between border-b border-border">
            <View className="flex-row items-center gap-3">
              <IconSymbol name="bell.fill" size={20} color={colors.primary} />
              <Text className="text-sm text-foreground">Renewal Reminders</Text>
            </View>
            <Switch
              value={profile?.notificationsEnabled ?? true}
              onValueChange={(v) => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                profileUpdate.mutate({ notificationsEnabled: v });
              }}
              trackColor={{ false: colors.border, true: colors.primary + "60" }}
              thumbColor={profile?.notificationsEnabled ? colors.primary : colors.muted}
            />
          </View>

          <View className="px-5 py-3 flex-row items-center justify-between border-b border-border">
            <View className="flex-row items-center gap-3">
              <IconSymbol name="doc.text.fill" size={20} color={colors.primary} />
              <Text className="text-sm text-foreground">Currency</Text>
            </View>
            <Text className="text-sm text-muted">{profile?.currency ?? "USD"}</Text>
          </View>

          <Pressable
            onPress={() => {}}
            style={({ pressed }) => [
              {
                paddingHorizontal: 20,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottomWidth: 0.5,
                borderBottomColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View className="flex-row items-center gap-3">
              <IconSymbol name="shield.fill" size={20} color={colors.primary} />
              <Text className="text-sm text-foreground">Privacy Policy</Text>
            </View>
            <IconSymbol name="chevron.right" size={14} color={colors.muted} />
          </Pressable>

          <Pressable
            onPress={() => {}}
            style={({ pressed }) => [
              {
                paddingHorizontal: 20,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View className="flex-row items-center gap-3">
              <IconSymbol name="doc.text.fill" size={20} color={colors.primary} />
              <Text className="text-sm text-foreground">About SubZero</Text>
            </View>
            <IconSymbol name="chevron.right" size={14} color={colors.muted} />
          </Pressable>
        </View>

        {/* Scan Info */}
        <View className="bg-surface rounded-2xl p-5 border border-border mb-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-foreground">Scans this month</Text>
            <Text className="text-sm font-semibold text-foreground">
              {profile?.scansThisMonth ?? 0} / {isPro ? "\u221E" : "1"}
            </Text>
          </View>
        </View>

        {/* Sign Out */}
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            {
              backgroundColor: colors.error + "10",
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
              marginBottom: 8,
            },
          ]}
        >
          <Text className="text-error text-base font-semibold">Sign Out</Text>
        </Pressable>

        {/* Version */}
        <Text className="text-xs text-muted text-center mt-4">SubZero v1.5.0</Text>
      </ScrollView>
    </ScreenContainer>
  );
}
