import { ScrollView, Text, View, Pressable, Platform, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";

const freeFeatures = [
  { text: "1 email scan per month", included: true },
  { text: "Up to 10 subscriptions", included: true },
  { text: "Basic spending overview", included: true },
  { text: "Unlimited scans", included: false },
  { text: "Full analytics & trends", included: false },
  { text: "Export reports", included: false },
  { text: "Manual subscription add", included: false },
  { text: "Savings insights", included: false },
];

const proFeatures = [
  { text: "Unlimited email scans", included: true },
  { text: "Unlimited subscriptions", included: true },
  { text: "Full analytics & trends", included: true },
  { text: "Export reports (CSV/PDF)", included: true },
  { text: "Manual subscription add", included: true },
  { text: "Potential savings insights", included: true },
  { text: "Priority support", included: true },
  { text: "Early access to features", included: true },
];

export default function PricingScreen() {
  const router = useRouter();
  const colors = useColors();

  const handleUpgrade = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (Platform.OS === "web") {
      alert("Stripe integration coming soon! Pro features will be available shortly.");
    } else {
      Alert.alert(
        "Coming Soon",
        "Stripe integration is being set up. Pro features will be available shortly.",
        [{ text: "OK" }]
      );
    }
  };

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
              <Text className="text-3xl font-bold text-foreground">$4.99</Text>
              <Text className="text-sm text-muted">/month</Text>
            </View>
            <Text className="text-xs text-muted mb-4">
              or $39.99/year (save 33%)
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
            style={({ pressed }) => [
              {
                backgroundColor: colors.primary,
                paddingVertical: 16,
                borderRadius: 14,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <IconSymbol name="crown.fill" size={20} color="#FFFFFF" />
            <Text className="text-white text-base font-semibold">
              Upgrade to Pro
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (Platform.OS === "web") {
                alert("Restore purchases is not yet available.");
              } else {
                Alert.alert("Restore Purchases", "This feature will be available once Stripe is integrated.");
              }
            }}
            style={({ pressed }) => [
              { paddingVertical: 14, alignItems: "center", opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <Text className="text-primary text-sm font-medium">Restore Purchases</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
