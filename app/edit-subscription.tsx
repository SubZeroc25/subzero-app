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
  discountPercent?: string;
  discountAmount?: string;
  originalAmount?: string;
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
  if (!value.trim()) return undefined;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value.trim())) return "Use format YYYY-MM-DD";
  const parsed = new Date(value.trim());
  if (isNaN(parsed.getTime())) return "Invalid date";
  const year = parsed.getFullYear();
  if (year < 2020 || year > 2099) return "Year must be 2020-2099";
  return undefined;
}

function validatePercent(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const num = parseFloat(value);
  if (isNaN(num)) return "Enter a valid number";
  if (num < 0 || num > 100) return "Must be 0-100";
  return undefined;
}

function validateOptionalAmount(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const num = parseFloat(value);
  if (isNaN(num)) return "Enter a valid number";
  if (num < 0) return "Cannot be negative";
  if (num > 99999.99) return "Must be under $100,000";
  return undefined;
}

export default function EditSubscriptionScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ id: string }>();
  const isNewMode = params.id === "new";
  const subscriptionId = isNewMode ? null : (params.id ? parseInt(params.id) : null);

  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [status, setStatus] = useState("active");
  const [nextRenewalDate, setNextRenewalDate] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountNote, setDiscountNote] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [showDiscount, setShowDiscount] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const createMutation = trpc.subscriptions.create.useMutation();
  const updateMutation = trpc.subscriptions.update.useMutation();
  const deleteMutation = trpc.subscriptions.delete.useMutation();

  // Fetch existing subscription data for edit mode
  const subsQuery = trpc.subscriptions.list.useQuery(undefined, { enabled: !isNewMode });

  // Populate form with existing data when editing
  useEffect(() => {
    if (!isNewMode && subsQuery.data && subscriptionId) {
      const sub = subsQuery.data.find((s: any) => s.id === subscriptionId);
      if (sub) {
        setName(sub.name || "");
        setProvider(sub.provider || "");
        setAmount(String(Number(sub.amount) || ""));
        setCategory(sub.category || "other");
        setBillingCycle(sub.billingCycle || "monthly");
        setStatus(sub.status || "active");
        setNextRenewalDate(
          sub.nextRenewalDate
            ? new Date(sub.nextRenewalDate).toISOString().split("T")[0]
            : ""
        );
        if (sub.discountPercent && Number(sub.discountPercent) > 0) {
          setDiscountPercent(String(sub.discountPercent));
          setShowDiscount(true);
        }
        if (sub.discountAmount && Number(sub.discountAmount) > 0) {
          setDiscountAmount(String(Number(sub.discountAmount)));
          setShowDiscount(true);
        }
        if (sub.discountNote) {
          setDiscountNote(sub.discountNote);
          setShowDiscount(true);
        }
      }
    }
  }, [isNewMode, subsQuery.data, subscriptionId]);

  const currentErrors = useMemo<FormErrors>(() => ({
    name: validateName(name),
    amount: validateAmount(amount),
    nextRenewalDate: validateDate(nextRenewalDate),
    discountPercent: validatePercent(discountPercent),
    discountAmount: validateOptionalAmount(discountAmount),
    originalAmount: validateOptionalAmount(originalAmount),
  }), [name, amount, nextRenewalDate, discountPercent, discountAmount, originalAmount]);

  const isFormValid = useMemo(() => {
    return !currentErrors.name && !currentErrors.amount && !currentErrors.nextRenewalDate
      && !currentErrors.discountPercent && !currentErrors.discountAmount && !currentErrors.originalAmount;
  }, [currentErrors]);

  const visibleErrors = useMemo<FormErrors>(() => ({
    name: touched.name ? currentErrors.name : undefined,
    amount: touched.amount ? currentErrors.amount : undefined,
    nextRenewalDate: touched.nextRenewalDate ? currentErrors.nextRenewalDate : undefined,
    discountPercent: touched.discountPercent ? currentErrors.discountPercent : undefined,
    discountAmount: touched.discountAmount ? currentErrors.discountAmount : undefined,
    originalAmount: touched.originalAmount ? currentErrors.originalAmount : undefined,
  }), [currentErrors, touched]);

  const handleBlur = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  // Auto-calculate discount amount from percent and original amount
  useEffect(() => {
    if (discountPercent && originalAmount) {
      const pct = parseFloat(discountPercent);
      const orig = parseFloat(originalAmount);
      if (!isNaN(pct) && !isNaN(orig) && pct > 0 && pct <= 100) {
        const discounted = orig * (1 - pct / 100);
        setAmount(discounted.toFixed(2));
        setDiscountAmount((orig - discounted).toFixed(2));
      }
    }
  }, [discountPercent, originalAmount]);

  const handleSave = async () => {
    setTouched({ name: true, amount: true, nextRenewalDate: true, discountPercent: true, discountAmount: true, originalAmount: true });
    setSaveError(null);

    if (!isFormValid) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSaving(true);

    try {
      const payload = {
        name: name.trim(),
        amount: parseFloat(amount),
        category: category as any,
        billingCycle: billingCycle as any,
        status: status as any,
        nextRenewalDate: nextRenewalDate.trim() || null,
        discountPercent: discountPercent ? parseFloat(discountPercent) : null,
        discountAmount: discountAmount ? parseFloat(discountAmount) : null,
        discountNote: discountNote.trim() || null,
        originalAmount: originalAmount ? parseFloat(originalAmount) : null,
      };

      if (isNewMode) {
        await createMutation.mutateAsync({
          ...payload,
          provider: provider.trim() || name.trim(),
        } as any);
      } else if (subscriptionId) {
        await updateMutation.mutateAsync({
          id: subscriptionId,
          ...payload,
        } as any);
      }

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
      multiline?: boolean;
    }
  ) => (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-foreground mb-1.5">{label}</Text>
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
        multiline={options?.multiline}
        numberOfLines={options?.multiline ? 2 : 1}
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: options?.error ? colors.error : colors.border,
          borderRadius: 10,
          paddingHorizontal: 16,
          paddingVertical: 12,
          color: colors.foreground,
          fontSize: 15,
          ...(options?.multiline ? { minHeight: 60, textAlignVertical: "top" as any } : {}),
        }}
      />
      {options?.error && (
        <View className="flex-row items-center gap-1 mt-1">
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
    <View className="mb-4">
      <Text className="text-sm font-semibold text-foreground mb-1.5">{label}</Text>
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
          <Text className="text-2xl font-bold text-foreground">
            {isNewMode ? "Add Subscription" : "Edit Subscription"}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 8 }]}
          >
            <IconSymbol name="xmark" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Loading state for edit mode */}
        {!isNewMode && subsQuery.isLoading && (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="text-sm text-muted mt-3">Loading subscription...</Text>
          </View>
        )}

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
        {(isNewMode || !subsQuery.isLoading) && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          {renderField("Service Name", name, setName, "name", {
            placeholder: "e.g., Netflix, Spotify, iCloud",
            error: visibleErrors.name,
          })}

          {isNewMode && renderField("Provider", provider, setProvider, "provider", {
            placeholder: "e.g., Apple, Google (optional)",
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

          {/* Discount Section */}
          <Pressable
            onPress={() => {
              setShowDiscount(!showDiscount);
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: colors.success + "08",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.success + "20",
                marginBottom: 16,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View className="flex-row items-center gap-2">
              <IconSymbol name="tag.fill" size={16} color={colors.success} />
              <Text className="text-sm font-medium" style={{ color: colors.success }}>
                {showDiscount ? "Hide Discount Options" : "Add Discount / Coupon"}
              </Text>
            </View>
            <IconSymbol
              name={showDiscount ? "chevron.up" : "chevron.down"}
              size={14}
              color={colors.success}
            />
          </Pressable>

          {showDiscount && (
            <View className="mb-4 p-4 rounded-xl border border-border" style={{ backgroundColor: colors.surface }}>
              <Text className="text-xs text-muted mb-3">
                Add discount details to track your savings. Enter original price and discount percentage to auto-calculate.
              </Text>

              {renderField("Original Price ($)", originalAmount, setOriginalAmount, "originalAmount", {
                placeholder: "Full price before discount",
                keyboardType: "decimal-pad",
                error: visibleErrors.originalAmount,
              })}

              {renderField("Discount (%)", discountPercent, setDiscountPercent, "discountPercent", {
                placeholder: "e.g., 20",
                keyboardType: "decimal-pad",
                error: visibleErrors.discountPercent,
              })}

              {renderField("Discount Amount ($)", discountAmount, setDiscountAmount, "discountAmount", {
                placeholder: "Auto-calculated or enter manually",
                keyboardType: "decimal-pad",
                error: visibleErrors.discountAmount,
              })}

              {renderField("Discount Note", discountNote, setDiscountNote, "discountNote", {
                placeholder: "e.g., Student discount, annual plan savings",
                multiline: true,
              })}

              {discountPercent && originalAmount && !currentErrors.discountPercent && !currentErrors.originalAmount && (
                <View className="p-3 rounded-lg" style={{ backgroundColor: colors.success + "10" }}>
                  <Text className="text-xs font-medium" style={{ color: colors.success }}>
                    You save ${discountAmount || "0.00"}/{billingCycle} ({discountPercent}% off ${originalAmount})
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Cancel For Me Button (only in edit mode for active subs) */}
          {!isNewMode && subscriptionId && status === "active" && (
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({ pathname: "/cancel-subscription", params: { id: String(subscriptionId) } });
              }}
              disabled={isSaving}
              style={({ pressed }) => [
                {
                  backgroundColor: colors.error,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                  opacity: pressed ? 0.8 : isSaving ? 0.5 : 1,
                  marginTop: 8,
                },
              ]}
            >
              <IconSymbol name="bolt.fill" size={16} color="#FFFFFF" />
              <Text className="text-white text-base font-semibold">Cancel For Me</Text>
            </Pressable>
          )}

          {/* Delete Button (only in edit mode) */}
          {!isNewMode && subscriptionId && (
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
          )}
        </ScrollView>
        )}

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
              {isSaving ? "Saving..." : isNewMode ? "Add Subscription" : "Save Changes"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}
