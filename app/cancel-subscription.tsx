import { Text, View, ScrollView, TextInput, TouchableOpacity, Platform, Alert, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter, useLocalSearchParams } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import * as MailComposer from "expo-mail-composer";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

type CancellationStep = "loading" | "info" | "preview" | "opening_mail" | "sent" | "error";

export default function CancelSubscriptionScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ id: string }>();
  const subscriptionId = params.id ? parseInt(params.id) : null;

  const [step, setStep] = useState<CancellationStep>("loading");
  const [customEmail, setCustomEmail] = useState("");
  const [useCustomEmail, setUseCustomEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [providerEmail, setProviderEmail] = useState("");
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch provider info
  const providerInfoQuery = trpc.cancellation.getProviderInfo.useQuery(
    { subscriptionId: subscriptionId! },
    { enabled: !!subscriptionId }
  );

  // Generate email mutation
  const generateMutation = trpc.cancellation.generateEmail.useMutation();

  // Record sent mutation
  const recordSentMutation = trpc.cancellation.recordSent.useMutation();

  useEffect(() => {
    if (providerInfoQuery.data) {
      setStep("info");
      if (providerInfoQuery.data.providerContact) {
        setProviderEmail(providerInfoQuery.data.providerContact.email);
      }
      if (providerInfoQuery.data.existingRequest) {
        setIsFollowUp(true);
      }
    }
    if (providerInfoQuery.error) {
      setStep("error");
      setErrorMessage(providerInfoQuery.error.message);
    }
  }, [providerInfoQuery.data, providerInfoQuery.error]);

  const handleGeneratePreview = async () => {
    if (!subscriptionId) return;
    setStep("loading");

    try {
      const result = await generateMutation.mutateAsync({
        subscriptionId,
        customProviderEmail: useCustomEmail ? customEmail : undefined,
      });
      setEmailSubject(result.subject);
      setEmailBody(result.body);
      setProviderEmail(result.providerEmail);
      setIsFollowUp(result.isFollowUp);
      setStep("preview");
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error: any) {
      setStep("error");
      setErrorMessage(error.message || "Failed to generate email preview");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleOpenMailApp = async () => {
    if (!subscriptionId) return;

    try {
      setStep("opening_mail");

      // Check if mail composer is available
      const isAvailable = await MailComposer.isAvailableAsync();

      if (!isAvailable) {
        // Fallback: show the email content for manual copy
        Alert.alert(
          "No Mail App Found",
          "Please copy the email content below and send it manually to " + providerEmail,
          [{ text: "OK", onPress: () => setStep("preview") }]
        );
        return;
      }

      const result = await MailComposer.composeAsync({
        recipients: [providerEmail],
        subject: emailSubject,
        body: emailBody,
        isHtml: false,
      });

      if (result.status === MailComposer.MailComposerStatus.SENT) {
        // Record that the email was sent
        await recordSentMutation.mutateAsync({
          subscriptionId,
          providerEmail,
          subject: emailSubject,
          body: emailBody,
        });
        setStep("sent");
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (result.status === MailComposer.MailComposerStatus.CANCELLED) {
        // User cancelled - go back to preview
        setStep("preview");
      } else {
        // Saved or undetermined - assume they might send it
        // Record optimistically
        await recordSentMutation.mutateAsync({
          subscriptionId,
          providerEmail,
          subject: emailSubject,
          body: emailBody,
        });
        setStep("sent");
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      console.error("[Cancel] Mail composer error:", error);
      setStep("error");
      setErrorMessage(error.message || "Failed to open mail app");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const sub = providerInfoQuery.data?.subscription;
  const contact = providerInfoQuery.data?.providerContact;
  const existingRequest = providerInfoQuery.data?.existingRequest;

  const renderInfoStep = () => (
    <View className="flex-1 gap-5">
      {/* Subscription Info Card */}
      <View className="rounded-2xl p-5 border border-border" style={{ backgroundColor: colors.surface }}>
        <Text className="text-xl font-bold text-foreground mb-1">{sub?.name}</Text>
        <Text className="text-sm text-muted mb-3">{sub?.provider}</Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-2xl font-bold text-error">${Number(sub?.amount || 0).toFixed(2)}</Text>
          <Text className="text-sm text-muted">/{sub?.billingCycle}</Text>
        </View>
      </View>

      {/* Provider Contact */}
      <View className="rounded-2xl p-5 border border-border" style={{ backgroundColor: colors.surface }}>
        <View className="flex-row items-center gap-2 mb-3">
          <IconSymbol name="envelope.fill" size={18} color={colors.primary} />
          <Text className="text-base font-semibold text-foreground">Provider Contact</Text>
        </View>

        {contact && !useCustomEmail ? (
          <View>
            <View className="flex-row items-center gap-2 mb-2">
              <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} />
              <Text className="text-sm text-foreground">{contact.email}</Text>
            </View>
            <Text className="text-xs text-muted mb-3">
              We found {contact.name}'s support email in our database.
            </Text>
            <TouchableOpacity onPress={() => setUseCustomEmail(true)} activeOpacity={0.7}>
              <Text className="text-xs font-medium" style={{ color: colors.primary }}>
                Use a different email instead
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text className="text-xs text-muted mb-2">
              {contact
                ? "Enter the provider's support/cancellation email:"
                : "We couldn't find this provider's email. Please enter their support email:"}
            </Text>
            <TextInput
              value={customEmail}
              onChangeText={setCustomEmail}
              placeholder="support@provider.com"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
              style={{
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                paddingHorizontal: 16,
                paddingVertical: 12,
                color: colors.foreground,
                fontSize: 15,
              }}
            />
            {contact && (
              <TouchableOpacity
                onPress={() => {
                  setUseCustomEmail(false);
                  setCustomEmail("");
                }}
                activeOpacity={0.7}
                style={{ marginTop: 8 }}
              >
                <Text className="text-xs font-medium" style={{ color: colors.primary }}>
                  Use detected email ({contact.email})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Existing Request Warning */}
      {existingRequest && (
        <View
          className="rounded-2xl p-4 border"
          style={{ backgroundColor: colors.warning + "10", borderColor: colors.warning + "30" }}
        >
          <View className="flex-row items-center gap-2 mb-2">
            <IconSymbol name="exclamationmark.triangle.fill" size={16} color={colors.warning} />
            <Text className="text-sm font-semibold" style={{ color: colors.warning }}>
              Previous Request Sent
            </Text>
          </View>
          <Text className="text-xs text-muted">
            A cancellation email was already sent ({existingRequest.followUpCount} follow-up{existingRequest.followUpCount !== 1 ? "s" : ""}).
            Sending again will escalate the tone and reference your previous unanswered requests.
          </Text>
        </View>
      )}

      {/* How it works */}
      <View className="rounded-2xl p-4 border border-border" style={{ backgroundColor: colors.surface }}>
        <Text className="text-sm font-semibold text-foreground mb-3">How it works</Text>
        <View className="gap-3">
          {[
            { icon: "sparkles" as const, text: "AI generates an aggressive cancellation email citing consumer protection laws" },
            { icon: "pencil" as const, text: "You review and edit the email before sending" },
            { icon: "paperplane.fill" as const, text: "Opens your mail app with the email pre-filled — you hit send" },
          ].map((item, i) => (
            <View key={i} className="flex-row items-start gap-3">
              <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: colors.primary + "15" }}>
                <Text className="text-xs font-bold" style={{ color: colors.primary }}>{i + 1}</Text>
              </View>
              <Text className="text-xs text-muted flex-1 leading-relaxed">{item.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Generate Button */}
      <TouchableOpacity
        onPress={handleGeneratePreview}
        className="rounded-xl p-4 items-center"
        activeOpacity={0.8}
        style={{ backgroundColor: colors.error }}
      >
        <View className="flex-row items-center gap-2">
          <IconSymbol name="bolt.fill" size={18} color="#fff" />
          <Text className="text-base font-bold" style={{ color: "#fff" }}>
            {isFollowUp ? "Generate Follow-Up Email" : "Generate Cancellation Email"}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderPreviewStep = () => (
    <View className="flex-1 gap-5">
      {/* Email Preview */}
      <View className="rounded-2xl border border-border overflow-hidden" style={{ backgroundColor: colors.surface }}>
        <View className="p-4 border-b border-border">
          <View className="flex-row items-center gap-2 mb-2">
            <Text className="text-xs text-muted w-10">To:</Text>
            <Text className="text-sm text-foreground flex-1">{providerEmail}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Text className="text-xs text-muted w-10">Subj:</Text>
            <TextInput
              value={emailSubject}
              onChangeText={setEmailSubject}
              style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", flex: 1 }}
              returnKeyType="done"
            />
          </View>
        </View>
        <View className="p-4">
          <TextInput
            value={emailBody}
            onChangeText={setEmailBody}
            multiline
            style={{
              color: colors.foreground,
              fontSize: 13,
              lineHeight: 20,
              minHeight: 200,
              textAlignVertical: "top",
            }}
          />
        </View>
      </View>

      {/* Tone indicator */}
      <View className="flex-row items-center gap-2 px-2">
        <IconSymbol name="bolt.fill" size={14} color={colors.error} />
        <Text className="text-xs text-muted flex-1">
          {isFollowUp
            ? "Escalated tone — references unanswered previous requests and regulatory action"
            : "Aggressive but professional — cites consumer protection laws and demands immediate action"}
        </Text>
      </View>

      {/* Action Buttons */}
      <View className="gap-3">
        <TouchableOpacity
          onPress={handleOpenMailApp}
          className="rounded-xl p-4 items-center"
          activeOpacity={0.8}
          style={{ backgroundColor: colors.error }}
        >
          <View className="flex-row items-center gap-2">
            <IconSymbol name="paperplane.fill" size={18} color="#fff" />
            <Text className="text-base font-bold" style={{ color: "#fff" }}>
              Open in Mail App
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setStep("info")}
          className="rounded-xl p-3 items-center border border-border"
          activeOpacity={0.8}
          style={{ backgroundColor: colors.surface }}
        >
          <Text className="text-sm font-medium text-foreground">Back to Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSentStep = () => (
    <View className="flex-1 items-center justify-center gap-6">
      <View className="w-24 h-24 rounded-full items-center justify-center" style={{ backgroundColor: colors.success + "15" }}>
        <IconSymbol name="checkmark.circle.fill" size={48} color={colors.success} />
      </View>
      <View className="items-center gap-2">
        <Text className="text-2xl font-bold text-foreground">Email Sent!</Text>
        <Text className="text-sm text-muted text-center px-8">
          Your cancellation email has been sent to {providerEmail}. The subscription has been marked as cancelled.
        </Text>
      </View>

      <View className="bg-surface rounded-2xl p-4 border border-border w-full">
        <Text className="text-sm font-semibold text-foreground mb-2">What happens next?</Text>
        <View className="gap-2">
          <Text className="text-xs text-muted leading-relaxed">
            • The provider should respond within 3-5 business days
          </Text>
          <Text className="text-xs text-muted leading-relaxed">
            • If they don't respond, come back and send a follow-up with escalated language
          </Text>
          <Text className="text-xs text-muted leading-relaxed">
            • Your subscription has been marked as "cancelled" in SubZero
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => router.back()}
        className="bg-primary rounded-xl p-4 items-center w-full"
        activeOpacity={0.8}
      >
        <Text className="text-base font-semibold" style={{ color: "#fff" }}>Done</Text>
      </TouchableOpacity>
    </View>
  );

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
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground">Cancel For Me</Text>
            {sub && <Text className="text-xs text-muted">{sub.name}</Text>}
          </View>
          {isFollowUp && (
            <View className="px-3 py-1 rounded-full" style={{ backgroundColor: colors.warning + "20" }}>
              <Text className="text-xs font-semibold" style={{ color: colors.warning }}>Follow-Up</Text>
            </View>
          )}
        </View>

        {/* Loading */}
        {(step === "loading" || step === "opening_mail") && (
          <View className="flex-1 items-center justify-center gap-4">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="text-sm text-muted">
              {step === "opening_mail" ? "Opening mail app..." : "Generating email..."}
            </Text>
          </View>
        )}

        {/* Error */}
        {step === "error" && (
          <View className="flex-1 items-center justify-center gap-6">
            <View className="w-20 h-20 rounded-full items-center justify-center" style={{ backgroundColor: colors.error + "15" }}>
              <IconSymbol name="xmark" size={36} color={colors.error} />
            </View>
            <Text className="text-base text-muted text-center px-8">{errorMessage}</Text>
            <View className="gap-3 w-full">
              <TouchableOpacity
                onPress={() => setStep("info")}
                className="bg-primary rounded-xl p-4 items-center"
                activeOpacity={0.8}
              >
                <Text className="text-base font-semibold" style={{ color: "#fff" }}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.back()}
                className="bg-surface rounded-xl p-3 items-center border border-border"
                activeOpacity={0.8}
              >
                <Text className="text-sm font-medium text-foreground">Go Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Info Step */}
        {step === "info" && renderInfoStep()}

        {/* Preview Step */}
        {step === "preview" && renderPreviewStep()}

        {/* Sent Step */}
        {step === "sent" && renderSentStep()}
      </ScrollView>
    </ScreenContainer>
  );
}
