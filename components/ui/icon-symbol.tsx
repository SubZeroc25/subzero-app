import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  // SubZero tabs
  "chart.bar.fill": "bar-chart",
  "creditcard.fill": "credit-card",
  "person.fill": "person",
  "rectangle.stack.fill": "layers",
  // General icons
  "magnifyingglass": "search",
  "xmark": "close",
  "checkmark": "check",
  "plus": "add",
  "arrow.right": "arrow-forward",
  "arrow.left": "arrow-back",
  "lock.fill": "lock",
  "bell.fill": "notifications",
  "gear": "settings",
  "envelope.fill": "email",
  "shield.fill": "shield",
  "star.fill": "star",
  "bolt.fill": "flash-on",
  "crown.fill": "workspace-premium",
  "gearshape.2.fill": "admin-panel-settings",
  "tag.fill": "local-offer",
  "percent": "percent",
  "gift.fill": "card-giftcard",
  "arrow.clockwise": "refresh",
  "trash.fill": "delete",
  "doc.text.fill": "description",
  "eye.slash.fill": "visibility-off",
  "eye.fill": "visibility",
  // Cancellation feature
  "pause.fill": "pause",
  "exclamationmark.triangle.fill": "warning",
  "paperplane.circle.fill": "send",
  "chevron.up": "expand-less",
  "chevron.down": "expand-more",
  "phone.fill": "phone",
  "clock.fill": "schedule",
  "checkmark.circle.fill": "check-circle",
  "xmark.circle.fill": "cancel",
  "pencil": "edit",
  "doc.on.doc.fill": "content-copy",
  "calendar": "event",
  "info.circle.fill": "info",
  "link": "link",
  // Analytics category icons
  "play.fill": "play-arrow",
  "hammer.fill": "build",
  "cloud.fill": "cloud",
  "heart.fill": "favorite",
  "book.fill": "menu-book",
  "cart.fill": "shopping-cart",
  "newspaper.fill": "article",
  "person.2.fill": "people",
  "ellipsis": "more-horiz",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
