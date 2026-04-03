import { ScrollView, Text, View, Pressable, Platform, Alert, ActivityIndicator, TextInput } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import Constants from "expo-constants";

const API_BASE = Constants.expoConfig?.extra?.apiBaseUrl
  || process.env.EXPO_PUBLIC_API_BASE_URL
  || "http://localhost:3000";

const freeFeatures = [
  { text: "1 email scan per month", included: true },
  { text: "Up to 10 subscriptions", included: true },
  { text: "Basic spending overview", included: true },
  { text: "Unlimited scans", included: false },
  { text: "Full analytics & trends", included: false },
  { text: "Export reports", included: false },
  { text: "Discount tracking", included: false },
  { text: "Savings insights", included: false },
];

const proFeatures = [
  { text: "Unlimited email scans", included: true },
  { text: "Unlimited subscriptions", included: true },
  { text: "Full analytics & trends", included: true },
  { text: "Export reports (CSV/PDF)", included: true },
  { text: "Discount & coupon tracking", included: true },
  { text: "Potential savings insights", included: true },
  { text: "Priority support", included: true },
  { text: "Early access to features", included: true },
];

export default function PricingScreen() {
  const router = useRouter();
  const colors = useColors();

  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoResult, setPromoResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showPromo, setShowPromo] = useState(false);

  const redeemPromo = trpc.profile.redeemPromo.useMutation();
  const profileQuery = trpc.profile.get.useQuery();
  const isPro = profileQuery.data?.plan === "pro";

  const handleUpgrade = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
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

      if (response.ok && data.url) {
        await WebBrowser.openBrowserAsync(data.url);
        profileQuery.refetch();
      } else if (data.configured === false) {
        // Stripe not configured — show promo code option
        setShowPromo(true);
        const msg = "Stripe checkout is being set up. You can use a promo code to upgrade now.";
        if (Platform.OS === "web") alert(msg);
        else Alert.alert("Use Promo Code", msg);
      } else {
        const msg = data.error || "Failed to start checkout.";
        if (Platform.OS === "web") alert(msg);
        else Alert.alert("Error", msg);
      }
    } catch (error) {
      setShowPromo(true);
      const msg = "Stripe checkout is being set up. You can use a promo code to upgrade now.";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("Use Promo Code", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoResult(null);
    try {
      const result = await redeemPromo.mutateAsync({ code: promoCode.trim() });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPromoResult({ type: "success", message: result.message });
      setPromoCode("");
      profileQuery.refetch();
      // Navigate back after success
      setTimeout(() => router.back(), 1500);
    } catch (error: any) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPromoResult({ type: "error", message: error?.message || "Invalid promo code" });
    } finally {
      setPromoLoading(false);
    }
  };

  if (isPro) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-3xl bg-primary/10 items-center justify-center mb-4">
            <IconSymbol name="crown.fill" size={40} color={colors.primary} />
          </View>
          <Text className="text-2xl font-bold text-foreground mb-2">You're on Pro!</Text>
          <Text className="text-sm text-muted text-center mb-8">
            You have access to all premium features. Thank you for your support.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              {
                backgroundColor: colors.primary,
                paddingHorizontal: 32,
                paddingVertical: 14,
                borderRadius: 14,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text className="text-white text-base font-semibold">Go Back</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-4 pb-8">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 4 }]}
            >
              <IconSymbol name="xmark" size={24} color={colors.foreground} />
            </Pressable>
            <Text className="text-lg font-bold text-foreground">Choose Your Plan</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Free Plan */}
          <View className="bg-surface rounded-2xl border border-border p-5 mb-4">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-lg font-bold text-foreground">Free</Text>
                <Text className="text-sm text-muted">Get started</Text>
              </View>
              <View className="bg-background px-3 py-1.5 rounded-full border border-border">
                <Text className="text-sm font-semibold text-foreground">$0</Text>
              </View>
            </View>
            {freeFeatures.map((f, i) => (
              <View key={i} className="flex-row items-center gap-3 mb-2.5">
                <IconSymbol
                  name={f.included ? "checkmark" : "xmark"}
                  size={16}
                  color={f.included ? colors.success : colors.muted}
                />
                <Text
                  className="text-sm"
                  style={{ color: f.included ? colors.foreground : colors.muted }}
                >
                  {f.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Pro Plan */}
          <View className="bg-surface rounded-2xl border-2 border-primary p-5 mb-6">
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-lg font-bold text-foreground">Pro</Text>
                <View className="bg-primary/10 px-2 py-0.5 rounded-full">
                  <Text className="text-xs font-semibold text-primary">RECOMMENDED</Text>
                </View>
              </View>
            </View>
            <View className="flex-row items-baseline gap-1 mb-4">
              <Text className="text-3xl font-bold text-foreground">$9.99</Text>
              <Text className="text-sm text-muted">/month</Text>
            </View>
            <Text className="text-xs text-muted mb-4">
              or $79.99/year (save 33%)
            </Text>
            {proFeatures.map((f, i) => (
              <View key={i} className="flex-row items-center gap-3 mb-2.5">
                <IconSymbol name="checkmark" size={16} color={colors.success} />
                <Text className="text-sm text-foreground">{f.text}</Text>
              </View>
            ))}
          </View>

          {/* Upgrade Button */}
          <Pressable
            onPress={handleUpgrade}
            disabled={loading}
            style={({ pressed }) => [
              {
                backgroundColor: colors.primary,
                paddingVertical: 16,
                borderRadius: 14,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
                opacity: pressed || loading ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <IconSymbol name="crown.fill" size={20} color="#FFFFFF" />
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white text-base font-semibold">
                Upgrade to Pro
              </Text>
            )}
          </Pressable>

          {/* Promo Code Section */}
          <Pressable
            onPress={() => setShowPromo(!showPromo)}
            style={({ pressed }) => [
              { paddingVertical: 14, alignItems: "center", opacity: pressed ? 0.5 : 1, flexDirection: "row", justifyContent: "center", gap: 6 },
            ]}
          >
            <IconSymbol name="gift.fill" size={14} color={colors.primary} />
            <Text className="text-primary text-sm font-medium">
              {showPromo ? "Hide promo code" : "Have a promo code?"}
            </Text>
          </Pressable>

          {showPromo && (
            <View className="mt-1">
              <View className="flex-row gap-2">
                <TextInput
                  value={promoCode}
                  onChangeText={(t) => { setPromoCode(t.toUpperCase()); setPromoResult(null); }}
                  placeholder="Enter promo code"
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
                      paddingHorizontal: 20,
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
                  className="mt-3 px-4 py-3 rounded-xl"
                  style={{ backgroundColor: promoResult.type === "success" ? colors.success + "15" : colors.error + "15" }}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{ color: promoResult.type === "success" ? colors.success : colors.error }}
                  >
                    {promoResult.message}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Trust Section */}
          <View className="mt-6 items-center">
            <View className="flex-row items-center gap-2 mb-2">
              <IconSymbol name="shield.fill" size={14} color={colors.muted} />
              <Text className="text-xs text-muted">Secure payment via Stripe</Text>
            </View>
            <Text className="text-xs text-muted text-center">
              Cancel anytime. No hidden fees. Your data stays private.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
