import { Text, View, Pressable, Platform, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { getApiBaseUrl } from "@/constants/oauth";

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
  const [connecting, setConnecting] = useState<string | null>(null);
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

  const handleConnectProvider = useCallback(async (provider: "gmail" | "outlook") => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConnecting(provider);

    try {
      const apiBase = getApiBaseUrl();
      // Build auth headers for native (Bearer token)
      const headers: Record<string, string> = {};
      if (Platform.OS !== "web") {
        const { getSessionToken } = await import("@/lib/_core/auth");
        const token = await getSessionToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiBase}/api/email/${provider}/authorize`, {
        credentials: "include",
        headers,
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.configured === false) {
          const providerName = provider === "gmail" ? "Gmail" : "Outlook";
          Alert.alert(
            `${providerName} Not Configured`,
            `${providerName} OAuth credentials are not set up yet. You can connect later from your Profile.`,
          );
          // Skip to next step
          setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
        } else {
          Alert.alert("Error", data.error || "Failed to start authorization");
        }
        return;
      }

      if (data.url) {
        if (Platform.OS !== "web") {
          const frontendUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/^(https?:\/\/)3000-/, "$18081-") || "http://localhost:8081";
          const result = await WebBrowser.openAuthSessionAsync(data.url, frontendUrl);
          console.log(`[Onboarding] ${provider} auth result:`, result);
          if (result.type === "success") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // Move to next step after successful connection
            setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
          }
        } else {
          window.location.href = data.url;
        }
      }
    } catch (error) {
      console.error(`[Onboarding] Connect ${provider} failed:`, error);
      Alert.alert("Error", `Failed to connect ${provider === "gmail" ? "Gmail" : "Outlook"}`);
    } finally {
      setConnecting(null);
    }
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
                onPress={() => handleConnectProvider("gmail")}
                disabled={connecting !== null}
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
                    opacity: pressed || connecting === "gmail" ? 0.6 : 1,
                  },
                ]}
              >
                <IconSymbol name="envelope.fill" size={20} color="#EA4335" />
                <Text className="text-foreground text-base font-medium">
                  {connecting === "gmail" ? "Connecting..." : "Connect Gmail"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleConnectProvider("outlook")}
                disabled={connecting !== null}
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
                    opacity: pressed || connecting === "outlook" ? 0.6 : 1,
                  },
                ]}
              >
                <IconSymbol name="envelope.fill" size={20} color="#0078D4" />
                <Text className="text-foreground text-base font-medium">
                  {connecting === "outlook" ? "Connecting..." : "Connect Outlook"}
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
