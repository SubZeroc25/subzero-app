import { Text, View, Pressable, ScrollView, TextInput, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter, useLocalSearchParams } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

const CATEGORIES = [
  "entertainment",
  "productivity",
  "cloud",
  "finance",
  "health",
  "education",
  "shopping",
  "news",
  "social",
  "utilities",
  "other",
];

const BILLING_CYCLES = ["weekly", "monthly", "quarterly", "yearly", "one-time"];
const STATUSES = ["active", "cancelled", "trial", "paused", "expired"];

export default function EditSubscriptionScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ id: string }>();
  const subscriptionId = params.id ? parseInt(params.id) : null;

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [status, setStatus] = useState("active");
  const [nextRenewalDate, setNextRenewalDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const updateMutation = trpc.subscriptions.update.useMutation();
  const deleteMutation = trpc.subscriptions.delete.useMutation();

  const handleSave = async () => {
    if (!subscriptionId || !name.trim() || !amount.trim()) return;

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSaving(true);

    try {
      await updateMutation.mutateAsync({
        id: subscriptionId,
        name: name.trim(),
        amount: parseFloat(amount),
        category: category as any,
        billingCycle: billingCycle as any,
        status: status as any,
        nextRenewalDate: nextRenewalDate || null,
      });

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error("Failed to save subscription:", error);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!subscriptionId) return;

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await deleteMutation.mutateAsync({ id: subscriptionId });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error("Failed to delete subscription:", error);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1 px-6">
        {/* Header */}
        <View className="flex-row items-center justify-between pt-4 pb-6">
          <Text className="text-2xl font-bold text-foreground">Edit Subscription</Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 8 }]}
          >
            <IconSymbol name="xmark" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Form */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          {/* Name */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Service Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g., Netflix"
              placeholderTextColor={colors.muted}
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              editable={!isSaving}
            />
          </View>

          {/* Amount */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Amount ($)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              editable={!isSaving}
            />
          </View>

          {/* Category */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  disabled={isSaving}
                  style={({ pressed }) => [
                    {
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: category === cat ? colors.primary : colors.surface,
                      borderWidth: 1,
                      borderColor: category === cat ? colors.primary : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text
                    className={`text-xs font-medium ${
                      category === cat ? "text-white" : "text-foreground"
                    }`}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Billing Cycle */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Billing Cycle</Text>
            <View className="gap-2">
              {BILLING_CYCLES.map((cycle) => (
                <Pressable
                  key={cycle}
                  onPress={() => setBillingCycle(cycle)}
                  disabled={isSaving}
                  style={({ pressed }) => [
                    {
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      borderRadius: 8,
                      backgroundColor: billingCycle === cycle ? colors.primary + "15" : colors.surface,
                      borderWidth: 1,
                      borderColor: billingCycle === cycle ? colors.primary : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text className="text-sm font-medium text-foreground capitalize">{cycle}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Status */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Status</Text>
            <View className="gap-2">
              {STATUSES.map((st) => (
                <Pressable
                  key={st}
                  onPress={() => setStatus(st)}
                  disabled={isSaving}
                  style={({ pressed }) => [
                    {
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      borderRadius: 8,
                      backgroundColor: status === st ? colors.primary + "15" : colors.surface,
                      borderWidth: 1,
                      borderColor: status === st ? colors.primary : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text className="text-sm font-medium text-foreground capitalize">{st}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Next Renewal Date */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Next Renewal Date</Text>
            <TextInput
              value={nextRenewalDate}
              onChangeText={setNextRenewalDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              editable={!isSaving}
            />
          </View>

          {/* Delete Button */}
          <Pressable
            onPress={handleDelete}
            disabled={isSaving}
            style={({ pressed }) => [
              {
                backgroundColor: colors.error + "20",
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text className="text-error text-base font-semibold">Delete Subscription</Text>
          </Pressable>
        </ScrollView>

        {/* Save Button */}
        <View className="gap-3 pb-4">
          <Pressable
            onPress={handleSave}
            disabled={isSaving || !name.trim() || !amount.trim()}
            style={({ pressed }) => [
              {
                backgroundColor: colors.primary,
                paddingVertical: 16,
                borderRadius: 14,
                alignItems: "center",
                opacity: pressed || isSaving ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text className="text-white text-base font-semibold">
              {isSaving ? "Saving..." : "Save Changes"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}
