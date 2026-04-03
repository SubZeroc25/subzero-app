import { useState } from "react";
import { Text, View, TouchableOpacity, ActivityIndicator, Alert, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAppContext } from "@/lib/app-context";
import { trpc } from "@/lib/trpc";

type ScanStep = "choose" | "uploading" | "completed" | "failed";

export default function ScanScreen() {
  const router = useRouter();
  const colors = useColors();
  const { state, refreshProfile } = useAppContext();
  const [step, setStep] = useState<ScanStep>("choose");
  const [result, setResult] = useState<{
    subscriptionsFound: number;
    subscriptions: Array<{ name: string; provider: string; amount: number; billingCycle: string }>;
    message: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const uploadMutation = trpc.scan.uploadAndExtract.useMutation();

  const pickImage = async (source: "camera" | "library") => {
    try {
      let pickerResult: ImagePicker.ImagePickerResult;

      if (source === "camera" && Platform.OS !== "web") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Needed", "Camera access is required to take photos of receipts.");
          return;
        }
        pickerResult = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.8,
          base64: true,
        });
      } else {
        // On web, requestMediaLibraryPermissionsAsync always returns granted
        if (Platform.OS !== "web") {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission Needed", "Photo library access is required to select receipt images.");
            return;
          }
        }
        pickerResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.8,
          base64: true,
        });
      }

      if (pickerResult.canceled || !pickerResult.assets?.[0]?.base64) {
        return;
      }

      const asset = pickerResult.assets[0];
      setStep("uploading");

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (!asset.base64) {
        setStep("failed");
        setErrorMessage("Failed to read image data. Please try again.");
        return;
      }

      const response = await uploadMutation.mutateAsync({
        imageBase64: asset.base64,
        mimeType: asset.mimeType || "image/jpeg",
      });

      setResult({
        subscriptionsFound: response.subscriptionsFound,
        subscriptions: response.subscriptions,
        message: response.message,
      });
      setStep("completed");

      if (response.subscriptionsFound > 0 && Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      console.error("[Scan] Error:", error);
      setErrorMessage(error.message || "Failed to process image. Please try again.");
      setStep("failed");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handleDone = () => {
    refreshProfile();
    router.back();
  };

  const handleRetry = () => {
    setStep("choose");
    setResult(null);
    setErrorMessage("");
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 8, marginRight: 8 }}
          >
            <IconSymbol name="xmark" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-foreground">Scan Receipt</Text>
        </View>

        {step === "choose" && (
          <View className="flex-1 gap-6">
            {/* Explanation */}
            <View className="items-center gap-3 py-6">
              <View className="w-20 h-20 rounded-full items-center justify-center" style={{ backgroundColor: colors.primary + "15" }}>
                <IconSymbol name="doc.text.viewfinder" size={40} color={colors.primary} />
              </View>
              <Text className="text-xl font-bold text-foreground text-center">
                Snap a Receipt or Screenshot
              </Text>
              <Text className="text-sm text-muted text-center px-4 leading-relaxed">
                Take a photo of a billing email, receipt, invoice, or subscription confirmation.
                Our AI will automatically extract the subscription details.
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="gap-4">
              {/* Camera option - only on mobile */}
              {Platform.OS !== "web" && (
                <TouchableOpacity
                  onPress={() => pickImage("camera")}
                  className="bg-primary rounded-2xl p-5 flex-row items-center"
                  activeOpacity={0.8}
                >
                  <View className="w-12 h-12 rounded-full items-center justify-center mr-4" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
                    <IconSymbol name="camera.fill" size={24} color="#fff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-semibold" style={{ color: "#fff" }}>Take Photo</Text>
                    <Text className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
                      Snap a receipt or billing email
                    </Text>
                  </View>
                  <IconSymbol name="chevron.right" size={20} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => pickImage("library")}
                className={Platform.OS === "web" ? "bg-primary rounded-2xl p-5 flex-row items-center" : "bg-surface rounded-2xl p-5 flex-row items-center border border-border"}
                activeOpacity={0.8}
              >
                <View className="w-12 h-12 rounded-full items-center justify-center mr-4" style={{ backgroundColor: Platform.OS === "web" ? "rgba(255,255,255,0.2)" : colors.primary + "15" }}>
                  <IconSymbol name="photo.fill" size={24} color={Platform.OS === "web" ? "#fff" : colors.primary} />
                </View>
                <View className="flex-1">
                  <Text className={Platform.OS === "web" ? "text-lg font-semibold" : "text-lg font-semibold text-foreground"} style={Platform.OS === "web" ? { color: "#fff" } : undefined}>
                    {Platform.OS === "web" ? "Upload Image" : "Choose from Library"}
                  </Text>
                  <Text className="text-sm" style={{ color: Platform.OS === "web" ? "rgba(255,255,255,0.8)" : colors.muted }}>
                    {Platform.OS === "web" ? "Select a screenshot or receipt from your computer" : "Select a saved screenshot or receipt"}
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={20} color={Platform.OS === "web" ? "rgba(255,255,255,0.6)" : colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Tips */}
            <View className="bg-surface rounded-2xl p-4 border border-border mt-2">
              <Text className="text-sm font-semibold text-foreground mb-3">Tips for best results</Text>
              <View className="gap-2">
                {[
                  "Screenshot billing emails showing amounts and dates",
                  "Capture payment receipts from your email",
                  "Photo subscription confirmation pages",
                  "Make sure text is clear and readable",
                ].map((tip, i) => (
                  <View key={i} className="flex-row items-start gap-2">
                    <Text className="text-sm" style={{ color: colors.success }}>✓</Text>
                    <Text className="text-sm text-muted flex-1">{tip}</Text>
                  </View>
                ))}
              </View>
            </View>

            {!state.isProUser && (
              <View className="bg-surface rounded-2xl p-4 border border-border">
                <Text className="text-xs text-muted text-center">
                  Free plan: 3 scans/month · Upgrade to Pro for unlimited
                </Text>
              </View>
            )}
          </View>
        )}

        {step === "uploading" && (
          <View className="flex-1 items-center justify-center gap-6">
            <View className="w-24 h-24 rounded-full items-center justify-center" style={{ backgroundColor: colors.primary + "15" }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
            <View className="items-center gap-2">
              <Text className="text-xl font-bold text-foreground">Analyzing Image</Text>
              <Text className="text-sm text-muted text-center px-8">
                Our AI is reading your receipt and extracting subscription details...
              </Text>
            </View>
          </View>
        )}

        {step === "completed" && result && (
          <View className="flex-1 gap-6">
            <View className="items-center gap-3 py-6">
              <View className="w-20 h-20 rounded-full items-center justify-center" style={{ backgroundColor: colors.success + "15" }}>
                <IconSymbol name="checkmark" size={40} color={colors.success} />
              </View>
              <Text className="text-xl font-bold text-foreground">Scan Complete</Text>
              <Text className="text-sm text-muted text-center px-4">
                {result.message}
              </Text>
            </View>

            {result.subscriptions.length > 0 && (
              <View className="gap-3">
                <Text className="text-sm font-semibold text-foreground">Subscriptions Found</Text>
                {result.subscriptions.map((sub, i) => (
                  <View key={i} className="bg-surface rounded-xl p-4 border border-border flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-foreground">{sub.name}</Text>
                      <Text className="text-sm text-muted">{sub.provider}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-base font-bold text-foreground">
                        ${sub.amount.toFixed(2)}
                      </Text>
                      <Text className="text-xs text-muted">/{sub.billingCycle}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View className="gap-3 mt-4">
              <TouchableOpacity
                onPress={() => pickImage("library")}
                className="bg-surface rounded-xl p-4 items-center border border-border"
                activeOpacity={0.8}
              >
                <Text className="text-base font-semibold" style={{ color: colors.primary }}>
                  Scan Another Receipt
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDone}
                className="bg-primary rounded-xl p-4 items-center"
                activeOpacity={0.8}
              >
                <Text className="text-base font-semibold" style={{ color: "#fff" }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === "failed" && (
          <View className="flex-1 items-center justify-center gap-6">
            <View className="w-20 h-20 rounded-full items-center justify-center" style={{ backgroundColor: colors.error + "15" }}>
              <IconSymbol name="xmark" size={40} color={colors.error} />
            </View>
            <View className="items-center gap-2">
              <Text className="text-xl font-bold text-foreground">Scan Failed</Text>
              <Text className="text-sm text-muted text-center px-8">
                {errorMessage}
              </Text>
            </View>
            <View className="gap-3 w-full px-4">
              <TouchableOpacity
                onPress={handleRetry}
                className="bg-primary rounded-xl p-4 items-center"
                activeOpacity={0.8}
              >
                <Text className="text-base font-semibold" style={{ color: "#fff" }}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.back()}
                className="bg-surface rounded-xl p-4 items-center border border-border"
                activeOpacity={0.8}
              >
                <Text className="text-base font-semibold text-foreground">Go Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
