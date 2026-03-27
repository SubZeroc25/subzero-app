import { Text, View, Pressable, Platform, Dimensions } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

const steps = [
  {
    icon: "bolt.fill" as const,
    title: "Welcome to SubZero",
    description:
      "Take control of your subscriptions. We help you find, track, and manage every recurring charge — so nothing slips through the cracks.",
    color: "#0066FF",
  },
  {
    icon: "envelope.fill" as const,
    title: "Connect Your Email",
    description:
      "Link your Gmail or Outlook account. We'll securely scan for billing and subscription emails to detect your active services.",
    color: "#10B981",
  },
  {
    icon: "shield.fill" as const,
    title: "AI-Powered & Private",
    description:
      "Our AI reads billing emails to extract subscription details. We never store your emails — only the subscription data you approve.",
    color: "#8B5CF6",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useColors();
  const [currentStep, setCurrentStep] = useState(0);
  const profileUpdate = trpc.profile.update.useMutation();

  const handleNext = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleComplete();
    }
  }, [currentStep]);

  const handleComplete = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await profileUpdate.mutateAsync({ onboardingComplete: true });
    } catch {}
    router.replace("/(tabs)" as any);
  }, []);

  const handleSkip = useCallback(() => {
    handleComplete();
  }, []);

  const step = steps[currentStep];

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1 px-6">
        {/* Skip */}
        <View className="flex-row justify-end pt-4">
          <Pressable
            onPress={handleSkip}
            style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 8 }]}
          >
            <Text className="text-muted text-sm font-medium">Skip</Text>
          </Pressable>
        </View>

        {/* Content */}
        <View className="flex-1 justify-center items-center">
          <View
            className="w-28 h-28 rounded-3xl items-center justify-center mb-8"
            style={{ backgroundColor: step.color + "15" }}
          >
            <IconSymbol name={step.icon} size={56} color={step.color} />
          </View>
          <Text className="text-3xl font-bold text-foreground text-center mb-4">
            {step.title}
          </Text>
          <Text className="text-base text-muted text-center leading-6 px-4">
            {step.description}
          </Text>

          {/* Email Connect Buttons (Step 2) */}
          {currentStep === 1 && (
            <View className="w-full mt-8 gap-3">
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => [
                  {
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingVertical: 14,
                    borderRadius: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <IconSymbol name="envelope.fill" size={20} color="#EA4335" />
                <Text className="text-foreground text-base font-medium">
                  Connect Gmail
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => [
                  {
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingVertical: 14,
                    borderRadius: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <IconSymbol name="envelope.fill" size={20} color="#0078D4" />
                <Text className="text-foreground text-base font-medium">
                  Connect Outlook
                </Text>
              </Pressable>
              <Text className="text-xs text-muted text-center mt-2">
                You can connect email accounts later from your Profile
              </Text>
            </View>
          )}
        </View>

        {/* Progress Dots & Button */}
        <View className="pb-8">
          <View className="flex-row justify-center gap-2 mb-6">
            {steps.map((_, i) => (
              <View
                key={i}
                className="h-2 rounded-full"
                style={{
                  width: i === currentStep ? 24 : 8,
                  backgroundColor: i === currentStep ? colors.primary : colors.border,
                }}
              />
            ))}
          </View>

          <Pressable
            onPress={handleNext}
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
              {currentStep === steps.length - 1 ? "Get Started" : "Continue"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}
