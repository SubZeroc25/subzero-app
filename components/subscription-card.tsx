import { Text, View, Pressable, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { useCallback, useRef } from "react";
import {
  Swipeable,
} from "react-native-gesture-handler";

const CATEGORY_COLORS: Record<string, string> = {
  entertainment: "#EF4444",
  productivity: "#3B82F6",
  cloud: "#8B5CF6",
  finance: "#10B981",
  health: "#F59E0B",
  education: "#06B6D4",
  shopping: "#EC4899",
  news: "#6366F1",
  social: "#14B8A6",
  utilities: "#64748B",
  other: "#9CA3AF",
};

export interface SubscriptionCardProps {
  item: {
    id: number;
    name: string;
    provider: string;
    amount: string | number;
    category: string;
    billingCycle: string;
    status: "active" | "cancelled" | "trial" | "paused" | "expired";
    discountPercent?: number | null;
    discountAmount?: string | number | null;
    discountNote?: string | null;
    originalAmount?: string | number | null;
  };
  onDelete: (id: number, name: string) => void;
  onCancel: (id: number) => void;
  onEdit: (id: number) => void;
}

export function SubscriptionCard({
  item,
  onDelete,
  onCancel,
  onEdit,
}: SubscriptionCardProps) {
  const router = useRouter();
  const colors = useColors();
  const swipeableRef = useRef<Swipeable>(null);
  const catColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other;

  const hasDiscount = (item.discountPercent && item.discountPercent > 0) ||
    (item.discountAmount && Number(item.discountAmount) > 0);

  const displayAmount = Number(item.amount);
  const originalAmount = item.originalAmount ? Number(item.originalAmount) : null;
  const savings = originalAmount && originalAmount > displayAmount
    ? (originalAmount - displayAmount)
    : item.discountAmount ? Number(item.discountAmount) : null;

  const handleEdit = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEdit(item.id);
  }, [item.id, onEdit]);

  const handleDelete = useCallback(() => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const doDelete = () => {
      onDelete(item.id, item.name);
      swipeableRef.current?.close();
    };

    if (Platform.OS === "web") {
      if (confirm(`Remove ${item.name}?`)) doDelete();
    } else {
      Alert.alert("Remove Subscription", `Remove ${item.name} from your list?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: doDelete },
      ]);
    }
  }, [item.id, item.name, onDelete]);

  const handleCancel = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCancel(item.id);
    swipeableRef.current?.close();
  }, [item.id, onCancel]);

  const renderRightActions = () => (
    <View className="flex-row gap-2 ml-2">
      {item.status === "active" && (
        <Pressable
          onPress={handleCancel}
          style={({ pressed }) => [
            {
              backgroundColor: colors.warning + "20",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              justifyContent: "center",
              alignItems: "center",
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <IconSymbol name="pause.fill" size={18} color={colors.warning} />
        </Pressable>
      )}
      <Pressable
        onPress={handleDelete}
        style={({ pressed }) => [
          {
            backgroundColor: colors.error + "20",
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            justifyContent: "center",
            alignItems: "center",
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <IconSymbol name="trash.fill" size={18} color={colors.error} />
      </Pressable>
    </View>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
    >
      <Pressable
        onPress={handleEdit}
        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
      >
        <View className="bg-surface rounded-xl border border-border p-4 mb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <View
                className="w-11 h-11 rounded-xl items-center justify-center"
                style={{ backgroundColor: catColor + "15" }}
              >
                <Text className="text-base font-bold" style={{ color: catColor }}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                  {item.name}
                </Text>
                <View className="flex-row items-center gap-2 mt-0.5">
                  <Text className="text-xs text-muted">{item.provider}</Text>
                  <View className="w-1 h-1 rounded-full bg-muted" />
                  <Text className="text-xs text-muted capitalize">{item.billingCycle}</Text>
                </View>
              </View>
            </View>
            <View className="items-end">
              <View className="flex-row items-center gap-1.5">
                {hasDiscount && originalAmount && originalAmount > displayAmount && (
                  <Text className="text-xs text-muted line-through">
                    ${originalAmount.toFixed(2)}
                  </Text>
                )}
                <Text className="text-base font-bold text-foreground">
                  ${displayAmount.toFixed(2)}
                </Text>
              </View>
              {hasDiscount && (
                <View className="flex-row items-center gap-1 mt-0.5">
                  <IconSymbol name="tag.fill" size={10} color={colors.success} />
                  <Text className="text-[10px] font-medium" style={{ color: colors.success }}>
                    {item.discountPercent ? `${item.discountPercent}% off` :
                     savings ? `Save $${savings.toFixed(2)}` : "Discount"}
                  </Text>
                </View>
              )}
              <View
                className="px-2 py-0.5 rounded-full mt-1"
                style={{
                  backgroundColor:
                    item.status === "active"
                      ? colors.success + "15"
                      : item.status === "trial"
                      ? colors.warning + "15"
                      : colors.error + "15",
                }}
              >
                <Text
                  className="text-[10px] font-medium capitalize"
                  style={{
                    color:
                      item.status === "active"
                        ? colors.success
                        : item.status === "trial"
                        ? colors.warning
                        : colors.error,
                  }}
                >
                  {item.status}
                </Text>
              </View>
            </View>
          </View>
          {item.discountNote && (
            <View className="mt-2 px-2 py-1.5 rounded-lg" style={{ backgroundColor: colors.success + "08" }}>
              <Text className="text-[11px] text-muted" numberOfLines={1}>
                {item.discountNote}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Swipeable>
  );
}
