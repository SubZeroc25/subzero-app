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
    desc: "Connect Gmail or Outlook and let AI detect your active subscriptions automatically.",
  },
  {
    icon: "chart.bar.fill" as const,
    title: "Spending Analytics",
    desc: "See exactly where your money goes with detailed breakdowns and trends.",
  },
  {
    icon: "shield.fill" as const,
    title: "Privacy First",
    desc: "We never store your emails. Only billing data is extracted and encrypted.",
  },
];

export default function LandingScreen() {
  const router = useRouter();
  const colors = useColors();

  const handleGetStarted = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/auth" as any);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-6 pt-16 pb-8">
          {/* Hero */}
          <View className="items-center mb-10">
            <View className="w-20 h-20 rounded-2xl bg-primary items-center justify-center mb-6">
              <IconSymbol name="bolt.fill" size={40} color="#FFFFFF" />
            </View>
            <Text className="text-4xl font-bold text-foreground text-center mb-3">
              SubZero
            </Text>
            <Text className="text-lg text-muted text-center leading-7 px-4">
              Track every subscription.{"\n"}Save every dollar.
            </Text>
          </View>

          {/* Features */}
          <View className="gap-4 mb-10">
            {features.map((f, i) => (
              <View
                key={i}
                className="bg-surface rounded-2xl p-5 border border-border flex-row items-start gap-4"
              >
                <View className="w-11 h-11 rounded-xl bg-primary/10 items-center justify-center mt-0.5">
                  <IconSymbol name={f.icon} size={22} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground mb-1">
                    {f.title}
                  </Text>
                  <Text className="text-sm text-muted leading-5">{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Trust Badge */}
          <View className="items-center mb-8">
            <View className="flex-row items-center gap-2 bg-success/10 px-4 py-2 rounded-full">
              <IconSymbol name="lock.fill" size={14} color={colors.success} />
              <Text className="text-xs font-medium text-success">
                Bank-level encryption · No email storage
              </Text>
            </View>
          </View>

          {/* CTA */}
          <View className="gap-3">
            <Pressable
              onPress={handleGetStarted}
              style={({ pressed }) => [
                {
                  backgroundColor: colors.primary,
                  paddingVertical: 16,
                  borderRadius: 14,
                  alignItems: "center",
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <Text className="text-white text-base font-semibold">
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
