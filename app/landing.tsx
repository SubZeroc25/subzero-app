import { ScrollView, Text, View, Pressable, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";

const features = [
  {
    icon: "envelope.fill" as const,
    title: "Smart Email Scanning",
    desc: "AI detects subscriptions from your Gmail or Outlook inbox automatically.",
    color: "#3B82F6",
  },
  {
    icon: "chart.bar.fill" as const,
    title: "Spending Analytics",
    desc: "See where your money goes with detailed breakdowns, trends, and insights.",
    color: "#8B5CF6",
  },
  {
    icon: "tag.fill" as const,
    title: "Discount Tracking",
    desc: "Track coupons and discounts to see exactly how much you're saving.",
    color: "#10B981",
  },
  {
    icon: "bell.fill" as const,
    title: "Renewal Alerts",
    desc: "Never be surprised by a charge again. Get notified before renewals.",
    color: "#F59E0B",
  },
  {
    icon: "shield.fill" as const,
    title: "Privacy First",
    desc: "We never store your emails. Only billing data is extracted securely.",
    color: "#06B6D4",
  },
];

const stats = [
  { value: "$2,400+", label: "Avg. tracked/year" },
  { value: "12", label: "Avg. subscriptions" },
  { value: "$180", label: "Avg. savings found" },
];

export default function LandingScreen() {
  const router = useRouter();
  const colors = useColors();

  const handleGetStarted = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/auth" as any);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-6 pt-12 pb-8">
          {/* Hero */}
          <View className="items-center mb-10">
            <View className="w-24 h-24 rounded-3xl bg-primary items-center justify-center mb-6">
              <IconSymbol name="bolt.fill" size={48} color="#FFFFFF" />
            </View>
            <Text className="text-4xl font-bold text-foreground text-center mb-2">
              SubZero
            </Text>
            <Text className="text-lg text-muted text-center leading-7 px-2">
              Track every subscription.{"\n"}Save every dollar.
            </Text>
          </View>

          {/* Stats Row */}
          <View className="flex-row gap-3 mb-8">
            {stats.map((s, i) => (
              <View key={i} className="flex-1 bg-surface rounded-2xl p-4 border border-border items-center">
                <Text className="text-xl font-bold text-primary">{s.value}</Text>
                <Text className="text-[10px] text-muted mt-1 text-center">{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Features */}
          <View className="gap-3 mb-8">
            {features.map((f, i) => (
              <View
                key={i}
                className="bg-surface rounded-2xl p-4 border border-border flex-row items-center gap-4"
              >
                <View
                  className="w-11 h-11 rounded-xl items-center justify-center"
                  style={{ backgroundColor: f.color + "15" }}
                >
                  <IconSymbol name={f.icon} size={22} color={f.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground mb-0.5">
                    {f.title}
                  </Text>
                  <Text className="text-xs text-muted leading-4">{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Trust Badges */}
          <View className="items-center mb-6 gap-3">
            <View className="flex-row items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: colors.success + "10" }}>
              <IconSymbol name="lock.fill" size={14} color={colors.success} />
              <Text className="text-xs font-medium" style={{ color: colors.success }}>
                Bank-level encryption
              </Text>
            </View>
            <View className="flex-row items-center gap-4">
              <View className="flex-row items-center gap-1.5">
                <IconSymbol name="shield.fill" size={12} color={colors.muted} />
                <Text className="text-[10px] text-muted">No email storage</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <IconSymbol name="lock.fill" size={12} color={colors.muted} />
                <Text className="text-[10px] text-muted">GDPR compliant</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <IconSymbol name="checkmark" size={12} color={colors.muted} />
                <Text className="text-[10px] text-muted">SOC 2 ready</Text>
              </View>
            </View>
          </View>

          {/* CTA */}
          <View className="gap-3">
            <Pressable
              onPress={handleGetStarted}
              style={({ pressed }) => [
                {
                  backgroundColor: colors.primary,
                  paddingVertical: 18,
                  borderRadius: 16,
                  alignItems: "center",
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <Text className="text-white text-base font-bold">
                Get Started — It's Free
              </Text>
            </Pressable>

            <Pressable
              onPress={handleGetStarted}
              style={({ pressed }) => [
                {
                  paddingVertical: 14,
                  alignItems: "center",
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Text className="text-primary text-sm font-medium">
                Already have an account? Sign In
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
