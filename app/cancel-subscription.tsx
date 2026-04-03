import { Text, View, ScrollView, TextInput, Pressable, Platform, Alert, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter, useLocalSearchParams } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

type CancellationStep = "loading" | "info" | "preview" | "sending" | "sent" | "error";

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
  const [emailProvider, setEmailProvider] = useState<"gmail" | "outlook">("gmail");

  // Fetch provider info
  const providerInfoQuery = trpc.cancellation.getProviderInfo.useQuery(
    { subscriptionId: subscriptionId! },
    { enabled: !!subscriptionId }
  );

  // Profile to check connected email
  const profileQuery = trpc.profile.get.useQuery();

  // Preview mutation
  const previewMutation = trpc.cancellation.previewEmail.useMutation();

  // Send mutation
  const sendMutation = trpc.cancellation.sendEmail.useMutation();

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

  useEffect(() => {
    if (profileQuery.data) {
      if (profileQuery.data.connectedGmail) setEmailProvider("gmail");
      else if (profileQuery.data.connectedOutlook) setEmailProvider("outlook");
    }
  }, [profileQuery.data]);

  const handleGeneratePreview = async () => {
    if (!subscriptionId) return;
    setStep("loading");

    try {
      const result = await previewMutation.mutateAsync({
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

  const handleSendEmail = async () => {
    if (!subscriptionId) return;

    const doSend = async () => {
      setStep("sending");
      try {
        await sendMutation.mutateAsync({
          subscriptionId,
          providerEmail,
          subject: emailSubject,
          body: emailBody,
          emailProvider,
        });
        setStep("sent");
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error: any) {
        setStep("error");
        setErrorMessage(error.message || "Failed to send cancellation email");
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    };

    if (Platform.OS === "web") {
      if (confirm(`Send aggressive cancellation email to ${providerEmail}?`)) doSend();
    } else {
      Alert.alert(
        "Send Cancellation Email",
        `This will send an aggressive cancellation email to ${providerEmail} from your connected ${emailProvider === "gmail" ? "Gmail" : "Outlook"} account.\n\nThe email demands immediate cancellation and references consumer protection laws.\n\nProceed?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Send It", style: "destructive", onPress: doSend },
        ]
      );
    }
  };

  const sub = providerInfoQuery.data?.subscription;
  const contact = providerInfoQuery.data?.providerContact;
  const existingRequest = providerInfoQuery.data?.existingRequest;
  const hasConnectedEmail = profileQuery.data?.connectedGmail || profileQuery.data?.connectedOutlook;

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
            <Pressable
              onPress={() => setUseCustomEmail(true)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Text className="text-xs font-medium" style={{ color: colors.primary }}>
                Use a different email instead
              </Text>
            </Pressable>
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
              <Pressable
                onPress={() => {
                  setUseCustomEmail(false);
                  setCustomEmail("");
                }}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginTop: 8 }]}
              >
                <Text className="text-xs font-medium" style={{ color: colors.primary }}>
                  Use detected email ({contact.email})
                </Text>
              </Pressable>
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

      {/* Connected Email Check */}
      {!hasConnectedEmail && (
        <View
          className="rounded-2xl p-4 border"
          style={{ backgroundColor: colors.error + "10", borderColor: colors.error + "30" }}
        >
          <View className="flex-row items-center gap-2 mb-2">
            <IconSymbol name="exclamationmark.triangle.fill" size={16} color={colors.error} />
            <Text className="text-sm font-semibold text-error">Email Not Connected</Text>
          </View>
          <Text className="text-xs text-muted">
            You need to connect your Gmail or Outlook account in Profile to send cancellation emails.
          </Text>
        </View>
      )}

      {/* Email Provider Selector */}
      {hasConnectedEmail && (
        <View className="rounded-2xl p-4 border border-border" style={{ backgroundColor: colors.surface }}>
          <Text className="text-sm font-semibold text-foreground mb-2">Send From</Text>
          <View className="flex-row gap-3">
            {profileQuery.data?.connectedGmail && (
              <Pressable
                onPress={() => {
                  setEmailProvider("gmail");
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => [{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center" as const,
                  backgroundColor: emailProvider === "gmail" ? colors.primary + "15" : colors.background,
                  borderWidth: 1,
                  borderColor: emailProvider === "gmail" ? colors.primary : colors.border,
                  opacity: pressed ? 0.8 : 1,
                }]}
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: emailProvider === "gmail" ? colors.primary : colors.foreground }}
                >
                  Gmail
                </Text>
              </Pressable>
            )}
            {profileQuery.data?.connectedOutlook && (
              <Pressable
                onPress={() => {
                  setEmailProvider("outlook");
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => [{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center" as const,
                  backgroundColor: emailProvider === "outlook" ? colors.primary + "15" : colors.background,
                  borderWidth: 1,
                  borderColor: emailProvider === "outlook" ? colors.primary : colors.border,
                  opacity: pressed ? 0.8 : 1,
                }]}
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: emailProvider === "outlook" ? colors.primary : colors.foreground }}
                >
                  Outlook
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* What Happens Section */}
      <View className="rounded-2xl p-4 border border-border" style={{ backgroundColor: colors.surface }}>
        <Text className="text-sm font-semibold text-foreground mb-3">What happens next?</Text>
        <View className="gap-3">
          {[
            { icon: "pencil" as const, text: "AI generates an aggressive cancellation email citing consumer protection laws" },
            { icon: "eye.fill" as const, text: "You review and can edit the email before sending" },
            { icon: "paperplane.fill" as const, text: `Email is sent from your ${emailProvider === "gmail" ? "Gmail" : "Outlook"} to the provider` },
            { icon: "exclamationmark.triangle.fill" as const, text: "If no response, you can send escalating follow-ups" },
          ].map((item, i) => (
            <View key={i} className="flex-row items-start gap-3">
              <View
                className="w-7 h-7 rounded-full items-center justify-center mt-0.5"
                style={{ backgroundColor: colors.primary + "15" }}
              >
                <IconSymbol name={item.icon} size={14} color={colors.primary} />
              </View>
              <Text className="text-sm text-muted flex-1 leading-5">{item.text}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderPreviewStep = () => (
    <View className="flex-1 gap-4">
      {/* Email Header */}
      <View className="rounded-2xl p-5 border border-border" style={{ backgroundColor: colors.surface }}>
        <View className="flex-row items-center gap-2 mb-4">
          <IconSymbol name="envelope.fill" size={20} color={colors.error} />
          <Text className="text-lg font-bold text-foreground">
            {isFollowUp ? "Follow-Up Email" : "Cancellation Email"}
          </Text>
        </View>

        <View className="gap-2 mb-4">
          <View className="flex-row">
            <Text className="text-xs text-muted w-12">To:</Text>
            <Text className="text-xs text-foreground font-medium flex-1">{providerEmail}</Text>
          </View>
          <View className="flex-row">
            <Text className="text-xs text-muted w-12">Subj:</Text>
            <Text className="text-xs text-foreground font-medium flex-1">{emailSubject}</Text>
          </View>
        </View>

        <View
          className="rounded-xl p-4"
          style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}
        >
          <TextInput
            value={emailBody}
            onChangeText={setEmailBody}
            multiline
            style={{
              color: colors.foreground,
              fontSize: 13,
              lineHeight: 20,
              minHeight: 250,
              textAlignVertical: "top",
            }}
          />
        </View>

        <Text className="text-xs text-muted mt-2 text-center">
          You can edit the email above before sending
        </Text>
      </View>

      {/* Tone Indicator */}
      <View
        className="rounded-xl p-3 flex-row items-center gap-2"
        style={{ backgroundColor: colors.error + "10" }}
      >
        <IconSymbol name="bolt.fill" size={16} color={colors.error} />
        <Text className="text-xs font-medium text-error flex-1">
          {isFollowUp
            ? `Escalated tone — Follow-up #${(existingRequest?.followUpCount ?? 0) + 1}. References FTC violations and threatens legal action.`
            : "Firm tone — References consumer protection laws and demands immediate cancellation with written confirmation."}
        </Text>
      </View>
    </View>
  );

  const renderSentStep = () => (
    <View className="flex-1 items-center justify-center gap-6 px-4">
      <View
        className="w-20 h-20 rounded-full items-center justify-center"
        style={{ backgroundColor: colors.success + "15" }}
      >
        <IconSymbol name="checkmark.circle.fill" size={48} color={colors.success} />
      </View>
      <View className="items-center gap-2">
        <Text className="text-2xl font-bold text-foreground text-center">
          Cancellation Email Sent!
        </Text>
        <Text className="text-base text-muted text-center leading-6">
          An aggressive cancellation email has been sent to{"\n"}
          <Text className="font-semibold text-foreground">{providerEmail}</Text>
        </Text>
      </View>

      <View className="w-full rounded-2xl p-5 border border-border" style={{ backgroundColor: colors.surface }}>
        <Text className="text-sm font-semibold text-foreground mb-3">What's next?</Text>
        <View className="gap-3">
          <View className="flex-row items-start gap-3">
            <IconSymbol name="clock.fill" size={16} color={colors.warning} />
            <Text className="text-sm text-muted flex-1">
              Wait 24-48 hours for the provider to respond
            </Text>
          </View>
          <View className="flex-row items-start gap-3">
            <IconSymbol name="envelope.fill" size={16} color={colors.primary} />
            <Text className="text-sm text-muted flex-1">
              Check your email for a cancellation confirmation
            </Text>
          </View>
          <View className="flex-row items-start gap-3">
            <IconSymbol name="exclamationmark.triangle.fill" size={16} color={colors.error} />
            <Text className="text-sm text-muted flex-1">
              No response? Come back and send an escalated follow-up
            </Text>
          </View>
        </View>
      </View>

      <View className="w-full gap-3 mt-4">
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [{
            backgroundColor: colors.primary,
            paddingVertical: 16,
            borderRadius: 14,
            alignItems: "center" as const,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          }]}
        >
          <Text className="text-white text-base font-semibold">Done</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderErrorStep = () => (
    <View className="flex-1 items-center justify-center gap-6 px-4">
      <View
        className="w-20 h-20 rounded-full items-center justify-center"
        style={{ backgroundColor: colors.error + "15" }}
      >
        <IconSymbol name="xmark.circle.fill" size={48} color={colors.error} />
      </View>
      <View className="items-center gap-2">
        <Text className="text-xl font-bold text-foreground text-center">Something went wrong</Text>
        <Text className="text-sm text-muted text-center leading-5">{errorMessage}</Text>
      </View>
      <Pressable
        onPress={() => {
          setStep("info");
          setErrorMessage("");
        }}
        style={({ pressed }) => [{
          backgroundColor: colors.primary,
          paddingHorizontal: 32,
          paddingVertical: 14,
          borderRadius: 14,
          opacity: pressed ? 0.85 : 1,
        }]}
      >
        <Text className="text-white text-base font-semibold">Try Again</Text>
      </Pressable>
    </View>
  );

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1 px-6">
        {/* Header */}
        <View className="flex-row items-center justify-between pt-4 pb-4">
          <View className="flex-row items-center gap-3">
            {step === "preview" && (
              <Pressable
                onPress={() => setStep("info")}
                style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 4 }]}
              >
                <IconSymbol name="arrow.left" size={22} color={colors.foreground} />
              </Pressable>
            )}
            <View>
              <Text className="text-xl font-bold text-error">
                {isFollowUp ? "Send Follow-Up" : "Cancel For Me"}
              </Text>
              <Text className="text-xs text-muted">
                {step === "preview" ? "Review & edit before sending" : "AI-powered cancellation"}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 8 }]}
          >
            <IconSymbol name="xmark" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Content */}
        {(step === "loading" || step === "sending") ? (
          <View className="flex-1 items-center justify-center gap-4">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="text-base text-muted">
              {step === "sending" ? "Sending cancellation email..." : "Loading..."}
            </Text>
          </View>
        ) : step === "sent" ? (
          renderSentStep()
        ) : step === "error" ? (
          renderErrorStep()
        ) : (
          <>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {step === "info" && renderInfoStep()}
              {step === "preview" && renderPreviewStep()}
            </ScrollView>

            {/* Bottom Action Button */}
            <View className="gap-3 pb-4">
              {step === "info" && (
                <Pressable
                  onPress={handleGeneratePreview}
                  disabled={!hasConnectedEmail || (!contact && !customEmail) || (useCustomEmail && !customEmail)}
                  style={({ pressed }) => [{
                    backgroundColor: (!hasConnectedEmail || (!contact && !customEmail) || (useCustomEmail && !customEmail))
                      ? colors.muted : colors.error,
                    paddingVertical: 16,
                    borderRadius: 14,
                    alignItems: "center" as const,
                    flexDirection: "row" as const,
                    justifyContent: "center" as const,
                    gap: 8,
                    opacity: pressed ? 0.85 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  }]}
                >
                  <IconSymbol name="bolt.fill" size={18} color="#FFFFFF" />
                  <Text className="text-white text-base font-semibold">
                    {isFollowUp ? "Generate Follow-Up Email" : "Generate Cancellation Email"}
                  </Text>
                </Pressable>
              )}

              {step === "preview" && (
                <View className="gap-3">
                  <Pressable
                    onPress={handleGeneratePreview}
                    style={({ pressed }) => [{
                      backgroundColor: colors.surface,
                      paddingVertical: 14,
                      borderRadius: 14,
                      alignItems: "center" as const,
                      flexDirection: "row" as const,
                      justifyContent: "center" as const,
                      gap: 8,
                      borderWidth: 1,
                      borderColor: colors.border,
                      opacity: pressed ? 0.85 : 1,
                    }]}
                  >
                    <IconSymbol name="arrow.clockwise" size={16} color={colors.foreground} />
                    <Text className="text-foreground text-sm font-medium">Regenerate Email</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleSendEmail}
                    style={({ pressed }) => [{
                      backgroundColor: colors.error,
                      paddingVertical: 16,
                      borderRadius: 14,
                      alignItems: "center" as const,
                      flexDirection: "row" as const,
                      justifyContent: "center" as const,
                      gap: 8,
                      opacity: pressed ? 0.85 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    }]}
                  >
                    <IconSymbol name="paperplane.fill" size={18} color="#FFFFFF" />
                    <Text className="text-white text-base font-bold">
                      {isFollowUp ? "Send Escalated Follow-Up" : "Send Cancellation Email"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </>
        )}
      </View>
    </ScreenContainer>
  );
}
