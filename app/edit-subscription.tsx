import { Text, View, ScrollView, TextInput, Pressable, Platform, Alert, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter, useLocalSearchParams } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { useState, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";

const CATEGORIES = [
  "entertainment", "productivity", "cloud", "finance", "health",
  "education", "shopping", "news", "social", "utilities", "other",
];
const BILLING_CYCLES = ["weekly", "monthly", "quarterly", "yearly", "one-time"];
const STATUSES = ["active", "cancelled", "trial", "paused", "expired"];

interface FormErrors {
  name?: string;
  amount?: string;
  nextRenewalDate?: string;
}

function validateName(value: string): string | undefined {
  if (!value.trim()) return "Service name is required";
  if (value.trim().length < 2) return "Name must be at least 2 characters";
  if (value.trim().length > 100) return "Name must be under 100 characters";
  return undefined;
}

function validateAmount(value: string): string | undefined {
  if (!value.trim()) return "Amount is required";
  const num = parseFloat(value);
  if (isNaN(num)) return "Enter a valid number";
  if (num < 0) return "Amount cannot be negative";
  if (num > 99999.99) return "Amount must be under $100,000";
  if (!/^\d+(\.\d{0,2})?$/.test(value.trim())) return "Max 2 decimal places";
  return undefined;
}

function validateDate(value: string): string | undefined {
  if (!value.trim()) return undefined; // Date is optional
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value.trim())) return "Use format YYYY-MM-DD";
  const parsed = new Date(value.trim());
  if (isNaN(parsed.getTime())) return "Invalid date";
  const year = parsed.getFullYear();
  if (year < 2020 || year > 2099) return "Year must be 2020-2099";
  return undefined;
}

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
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateMutation = trpc.subscriptions.update.useMutation();
  const deleteMutation = trpc.subscriptions.delete.useMutation();

  // Validate all fields
  const currentErrors = useMemo<FormErrors>(() => ({
    name: validateName(name),
    amount: validateAmount(amount),
    nextRenewalDate: validateDate(nextRenewalDate),
  }), [name, amount, nextRenewalDate]);

  const isFormValid = useMemo(() => {
    return !currentErrors.name && !currentErrors.amount && !currentErrors.nextRenewalDate;
  }, [currentErrors]);

  // Show errors only for touched fields
  const visibleErrors = useMemo<FormErrors>(() => ({
    name: touched.name ? currentErrors.name : undefined,
    amount: touched.amount ? currentErrors.amount : undefined,
    nextRenewalDate: touched.nextRenewalDate ? currentErrors.nextRenewalDate : undefined,
  }), [currentErrors, touched]);

  const handleBlur = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleSave = async () => {
    // Mark all fields as touched to show all errors
    setTouched({ name: true, amount: true, nextRenewalDate: true });
    setSaveError(null);

    if (!isFormValid || !subscriptionId) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

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
        nextRenewalDate: nextRenewalDate.trim() || null,
      });

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error: any) {
      console.error("Failed to save subscription:", error);
      setSaveError(error?.message || "Failed to save. Please try again.");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!subscriptionId) return;

    const doDelete = async () => {
      try {
        await deleteMutation.mutateAsync({ id: subscriptionId });
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } catch (error: any) {
        console.error("Failed to delete subscription:", error);
        setSaveError(error?.message || "Failed to delete. Please try again.");
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    };

    if (Platform.OS === "web") {
      if (confirm("Permanently delete this subscription?")) doDelete();
    } else {
      Alert.alert(
        "Delete Subscription",
        "This action cannot be undone. Are you sure?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: doDelete },
        ]
      );
    }
  };

  const renderField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    fieldKey: string,
    options?: {
      placeholder?: string;
      keyboardType?: "default" | "decimal-pad";
      error?: string;
    }
  ) => (
    <View className="mb-5">
      <Text className="text-sm font-semibold text-foreground mb-2">{label}</Text>
      <TextInput
        value={value}
        onChangeText={(v) => {
          onChange(v);
          setSaveError(null);
        }}
        onBlur={() => handleBlur(fieldKey)}
        placeholder={options?.placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={options?.keyboardType || "default"}
        editable={!isSaving}
        returnKeyType="done"
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: options?.error ? colors.error : colors.border,
          borderRadius: 10,
          paddingHorizontal: 16,
          paddingVertical: 14,
          color: colors.foreground,
          fontSize: 15,
        }}
      />
      {options?.error && (
        <View className="flex-row items-center gap-1 mt-1.5">
          <IconSymbol name="exclamationmark.triangle.fill" size={12} color={colors.error} />
          <Text className="text-xs text-error">{options.error}</Text>
        </View>
      )}
    </View>
  );

  const renderChipGroup = (
    label: string,
    items: string[],
    selected: string,
    onSelect: (v: string) => void,
    horizontal?: boolean
  ) => (
    <View className="mb-5">
      <Text className="text-sm font-semibold text-foreground mb-2">{label}</Text>
      {horizontal ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {items.map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelect(item);
                }}
                disabled={isSaving}
                style={({ pressed }) => [
                  {
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: selected === item ? colors.primary : colors.surface,
                    borderWidth: 1,
                    borderColor: selected === item ? colors.primary : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  className="text-xs font-medium capitalize"
                  style={{ color: selected === item ? "#FFFFFF" : colors.foreground }}
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {items.map((item) => (
            <Pressable
              key={item}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(item);
              }}
              disabled={isSaving}
              style={({ pressed }) => [
                {
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: selected === item ? colors.primary + "15" : colors.surface,
                  borderWidth: 1,
                  borderColor: selected === item ? colors.primary : colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                className="text-sm font-medium capitalize"
                style={{ color: selected === item ? colors.primary : colors.foreground }}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1 px-6">
        {/* Header */}
        <View className="flex-row items-center justify-between pt-4 pb-4">
          <Text className="text-2xl font-bold text-foreground">Edit Subscription</Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 8 }]}
          >
            <IconSymbol name="xmark" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Save Error Banner */}
        {saveError && (
          <View
            className="flex-row items-center gap-2 p-3 rounded-lg mb-4"
            style={{ backgroundColor: colors.error + "15" }}
          >
            <IconSymbol name="exclamationmark.triangle.fill" size={16} color={colors.error} />
            <Text className="text-sm text-error flex-1">{saveError}</Text>
            <Pressable
              onPress={() => setSaveError(null)}
              style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
            >
              <IconSymbol name="xmark" size={14} color={colors.error} />
            </Pressable>
          </View>
        )}

        {/* Form */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          {renderField("Service Name", name, setName, "name", {
            placeholder: "e.g., Netflix",
            error: visibleErrors.name,
          })}

          {renderField("Amount ($)", amount, setAmount, "amount", {
            placeholder: "0.00",
            keyboardType: "decimal-pad",
            error: visibleErrors.amount,
          })}

          {renderChipGroup("Category", CATEGORIES, category, setCategory, true)}
          {renderChipGroup("Billing Cycle", BILLING_CYCLES, billingCycle, setBillingCycle)}
          {renderChipGroup("Status", STATUSES, status, setStatus)}

          {renderField("Next Renewal Date", nextRenewalDate, setNextRenewalDate, "nextRenewalDate", {
            placeholder: "YYYY-MM-DD (optional)",
            error: visibleErrors.nextRenewalDate,
          })}

          {/* Delete Button */}
          <Pressable
            onPress={handleDelete}
            disabled={isSaving}
            style={({ pressed }) => [
              {
                backgroundColor: colors.error + "15",
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
                opacity: pressed ? 0.8 : isSaving ? 0.5 : 1,
                marginTop: 8,
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
            disabled={isSaving}
            style={({ pressed }) => [
              {
                backgroundColor: isFormValid ? colors.primary : colors.muted,
                paddingVertical: 16,
                borderRadius: 14,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
                opacity: pressed || isSaving ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            {isSaving && <ActivityIndicator size="small" color="#FFFFFF" />}
            <Text className="text-white text-base font-semibold">
              {isSaving ? "Saving..." : "Save Changes"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}
