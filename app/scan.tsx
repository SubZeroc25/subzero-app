import { Text, View, Pressable, Platform, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import { useState, useEffect, useCallback, useRef } from "react";

type ScanStep = "choose" | "connecting" | "scanning" | "analyzing" | "completed" | "failed";

const PRIVACY_MESSAGES = [
  "We only read billing-related emails",
  "Your emails are never stored on our servers",
  "Only subscription data is extracted",
  "All data is encrypted in transit",
  "You can disconnect anytime from Profile",
];

export default function ScanScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const [step, setStep] = useState<ScanStep>("choose");
  const [provider, setProvider] = useState<"gmail" | "outlook">("gmail");
  const [jobId, setJobId] = useState<number | null>(null);
  const [emailsScanned, setEmailsScanned] = useState(0);
  const [subsFound, setSubsFound] = useState(0);
  const [privacyIdx, setPrivacyIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scanStart = trpc.scan.start.useMutation();
  const scanStatus = trpc.scan.status.useQuery(
    { jobId: jobId! },
    { enabled: !!jobId, refetchInterval: step !== "completed" && step !== "failed" ? 2000 : false }
  );

  // Rotate privacy messages
  useEffect(() => {
    if (step === "connecting" || step === "scanning" || step === "analyzing") {
      const interval = setInterval(() => {
        setPrivacyIdx((i) => (i + 1) % PRIVACY_MESSAGES.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [step]);

  // Watch scan status
  useEffect(() => {
    if (scanStatus.data) {
      const job = scanStatus.data;
      if (job.status === "completed") {
        setStep("completed");
        setEmailsScanned(job.emailsScanned);
        setSubsFound(job.subscriptionsFound);
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (job.status === "failed") {
        setStep("failed");
        setError("Scan failed. Please try again.");
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        setStep(job.status as ScanStep);
        setEmailsScanned(job.emailsScanned);
      }
    }
  }, [scanStatus.data]);

  const handleStartScan = useCallback(async (selectedProvider: "gmail" | "outlook") => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setProvider(selectedProvider);
    setStep("connecting");
    setError(null);
    try {
      const result = await scanStart.mutateAsync({ provider: selectedProvider });
      setJobId(result.jobId);
    } catch (e: any) {
      setStep("failed");
      setError(e.message || "Failed to start scan");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, []);

  const handleDone = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleRetry = () => {
    setStep("choose");
    setJobId(null);
    setError(null);
    setEmailsScanned(0);
    setSubsFound(0);
  };

  const getStepProgress = () => {
    switch (step) {
      case "connecting": return 0.15;
      case "scanning": return 0.5;
      case "analyzing": return 0.8;
      case "completed": return 1;
      default: return 0;
    }
  };

  const getStepLabel = () => {
    switch (step) {
      case "connecting": return "Connecting to email...";
      case "scanning": return `Scanning inbox... ${emailsScanned > 0 ? `(${emailsScanned} emails)` : ""}`;
      case "analyzing": return "Analyzing emails with AI...";
      case "completed": return `Found ${subsFound} subscription${subsFound !== 1 ? "s" : ""}!`;
      case "failed": return "Scan failed";
      default: return "";
    }
  };

  // Choose provider
  if (step === "choose") {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 px-6">
          {/* Header */}
          <View className="flex-row items-center justify-between pt-4 mb-8">
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 4 }]}
            >
              <IconSymbol name="xmark" size={24} color={colors.foreground} />
            </Pressable>
            <Text className="text-lg font-bold text-foreground">Scan Inbox</Text>
            <View style={{ width: 32 }} />
          </View>

          <View className="flex-1 justify-center">
            <View className="items-center mb-8">
              <View className="w-20 h-20 rounded-2xl bg-primary/10 items-center justify-center mb-4">
                <IconSymbol name="envelope.fill" size={40} color={colors.primary} />
              </View>
              <Text className="text-2xl font-bold text-foreground text-center mb-2">
                Choose Email Provider
              </Text>
              <Text className="text-sm text-muted text-center px-4">
                We'll scan your inbox for subscription and billing emails
              </Text>
            </View>

            <View className="gap-3 mb-8">
              <Pressable
                onPress={() => handleStartScan("gmail")}
                style={({ pressed }) => [
                  {
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderRadius: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    opacity: pressed ? 0.8 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <View className="w-12 h-12 rounded-xl bg-red-500/10 items-center justify-center">
                  <IconSymbol name="envelope.fill" size={24} color="#EA4335" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">Gmail</Text>
                  <Text className="text-xs text-muted">Scan Google email inbox</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.muted} />
              </Pressable>

              <Pressable
                onPress={() => handleStartScan("outlook")}
                style={({ pressed }) => [
                  {
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderRadius: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    opacity: pressed ? 0.8 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <View className="w-12 h-12 rounded-xl items-center justify-center" style={{ backgroundColor: "#0078D4" + "15" }}>
                  <IconSymbol name="envelope.fill" size={24} color="#0078D4" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">Outlook</Text>
                  <Text className="text-xs text-muted">Scan Microsoft email inbox</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.muted} />
              </Pressable>
            </View>

            {/* Privacy */}
            <View className="items-center">
              <View className="flex-row items-center gap-2 bg-success/10 px-4 py-2.5 rounded-full">
                <IconSymbol name="lock.fill" size={14} color={colors.success} />
                <Text className="text-xs font-medium text-success">
                  Your emails are never stored
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // Progress / Result
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1 px-6">
        {/* Header */}
        <View className="flex-row items-center justify-between pt-4 mb-8">
          <View style={{ width: 32 }} />
          <Text className="text-lg font-bold text-foreground">
            {step === "completed" ? "Scan Complete" : step === "failed" ? "Scan Failed" : "Scanning..."}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        <View className="flex-1 justify-center items-center">
          {/* Icon */}
          {step === "completed" ? (
            <View className="w-24 h-24 rounded-full bg-success/10 items-center justify-center mb-6">
              <IconSymbol name="checkmark" size={48} color={colors.success} />
            </View>
          ) : step === "failed" ? (
            <View className="w-24 h-24 rounded-full bg-error/10 items-center justify-center mb-6">
              <IconSymbol name="xmark" size={48} color={colors.error} />
            </View>
          ) : (
            <View className="w-24 h-24 rounded-full bg-primary/10 items-center justify-center mb-6">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}

          {/* Status */}
          <Text className="text-2xl font-bold text-foreground text-center mb-2">
            {getStepLabel()}
          </Text>

          {/* Error message */}
          {error && (
            <Text className="text-sm text-error text-center mb-4 px-4">{error}</Text>
          )}

          {/* Progress bar */}
          {step !== "failed" && step !== "completed" && (
            <View className="w-full max-w-xs mt-4 mb-6">
              <View className="h-2 bg-border rounded-full overflow-hidden">
                <View
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${getStepProgress() * 100}%` }}
                />
              </View>
              <View className="flex-row justify-between mt-2">
                <Text className="text-[10px] text-muted">Connect</Text>
                <Text className="text-[10px] text-muted">Scan</Text>
                <Text className="text-[10px] text-muted">Analyze</Text>
                <Text className="text-[10px] text-muted">Done</Text>
              </View>
            </View>
          )}

          {/* Stats (completed) */}
          {step === "completed" && (
            <View className="flex-row gap-4 mt-4 mb-6">
              <View className="bg-surface rounded-xl p-4 border border-border items-center min-w-[100px]">
                <Text className="text-2xl font-bold text-foreground">{emailsScanned}</Text>
                <Text className="text-xs text-muted">Emails Scanned</Text>
              </View>
              <View className="bg-surface rounded-xl p-4 border border-border items-center min-w-[100px]">
                <Text className="text-2xl font-bold text-primary">{subsFound}</Text>
                <Text className="text-xs text-muted">Found</Text>
              </View>
            </View>
          )}

          {/* Privacy message (during scan) */}
          {step !== "completed" && step !== "failed" && (
            <View className="flex-row items-center gap-2 mt-6 bg-surface px-4 py-3 rounded-xl border border-border">
              <IconSymbol name="shield.fill" size={14} color={colors.success} />
              <Text className="text-xs text-muted flex-1">{PRIVACY_MESSAGES[privacyIdx]}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View className="pb-8 gap-3">
          {step === "completed" && (
            <Pressable
              onPress={handleDone}
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
              <Text className="text-white text-base font-semibold">View Subscriptions</Text>
            </Pressable>
          )}
          {step === "failed" && (
            <>
              <Pressable
                onPress={handleRetry}
                style={({ pressed }) => [
                  {
                    backgroundColor: colors.primary,
                    paddingVertical: 16,
                    borderRadius: 14,
                    alignItems: "center",
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text className="text-white text-base font-semibold">Try Again</Text>
              </Pressable>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  { paddingVertical: 14, alignItems: "center", opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text className="text-muted text-sm font-medium">Cancel</Text>
              </Pressable>
            </>
          )}
          {step !== "completed" && step !== "failed" && (
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                { paddingVertical: 14, alignItems: "center", opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text className="text-muted text-sm font-medium">Cancel</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}
