import { ScrollView, Text, View, Pressable, Platform, Switch, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, isAuthenticated, logout } = useAuth();

  const profileQuery = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const profileUpdate = trpc.profile.update.useMutation({
    onSuccess: () => profileQuery.refetch(),
  });

  const profile = profileQuery.data;
  const isPro = profile?.plan === "pro";

  const handleLogout = () => {
    const doLogout = () => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      logout();
    };
    if (Platform.OS === "web") {
      if (confirm("Sign out of SubZero?")) doLogout();
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="px-6">
        <View className="flex-1 items-center justify-center">
          <IconSymbol name="person.fill" size={48} color={colors.muted} />
          <Text className="text-lg font-semibold text-foreground mt-4">Sign in Required</Text>
          <Text className="text-sm text-muted text-center mt-2">Sign in to view your profile</Text>
          <Pressable
            onPress={() => router.push("/auth" as any)}
            style={({ pressed }) => [
              {
                backgroundColor: colors.primary,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 12,
                marginTop: 16,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text className="text-white text-sm font-semibold">Sign In</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="pt-4 mb-6">
          <Text className="text-2xl font-bold text-foreground">Profile</Text>
        </View>

        {/* User Info */}
        <View className="bg-surface rounded-2xl p-5 border border-border mb-4">
          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-2xl bg-primary items-center justify-center">
              <Text className="text-2xl font-bold text-white">
                {(user?.name || "U").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-foreground">{user?.name || "User"}</Text>
              <Text className="text-sm text-muted">{user?.email || "No email"}</Text>
              <View className="flex-row items-center gap-2 mt-1">
                <View
                  className="px-2.5 py-0.5 rounded-full flex-row items-center gap-1"
                  style={{ backgroundColor: isPro ? colors.primary + "15" : colors.muted + "15" }}
                >
                  {isPro && <IconSymbol name="crown.fill" size={10} color={colors.primary} />}
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: isPro ? colors.primary : colors.muted }}
                  >
                    {isPro ? "Pro" : "Free"} Plan
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Plan */}
        {!isPro && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/pricing" as any);
            }}
            style={({ pressed }) => [
              {
                backgroundColor: colors.primary + "08",
                borderWidth: 1,
                borderColor: colors.primary + "30",
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
              <IconSymbol name="crown.fill" size={20} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">Upgrade to Pro</Text>
              <Text className="text-xs text-muted">Unlimited scans, full analytics, and more</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </Pressable>
        )}

        {/* Connected Accounts */}
        <View className="bg-surface rounded-2xl border border-border mb-4 overflow-hidden">
          <View className="px-5 pt-4 pb-2">
            <Text className="text-sm font-semibold text-muted uppercase tracking-wide">
              Connected Accounts
            </Text>
          </View>
          <View className="px-5 py-3 flex-row items-center justify-between border-b border-border">
            <View className="flex-row items-center gap-3">
              <IconSymbol name="envelope.fill" size={20} color="#EA4335" />
              <Text className="text-sm text-foreground">Gmail</Text>
            </View>
            <View
              className="px-2.5 py-1 rounded-full"
              style={{ backgroundColor: profile?.connectedGmail ? colors.success + "15" : colors.muted + "15" }}
            >
              <Text
                className="text-xs font-medium"
                style={{ color: profile?.connectedGmail ? colors.success : colors.muted }}
              >
                {profile?.connectedGmail ? "Connected" : "Not connected"}
              </Text>
            </View>
          </View>
          <View className="px-5 py-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <IconSymbol name="envelope.fill" size={20} color="#0078D4" />
              <Text className="text-sm text-foreground">Outlook</Text>
            </View>
            <View
              className="px-2.5 py-1 rounded-full"
              style={{ backgroundColor: profile?.connectedOutlook ? colors.success + "15" : colors.muted + "15" }}
            >
              <Text
                className="text-xs font-medium"
                style={{ color: profile?.connectedOutlook ? colors.success : colors.muted }}
              >
                {profile?.connectedOutlook ? "Connected" : "Not connected"}
              </Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View className="bg-surface rounded-2xl border border-border mb-4 overflow-hidden">
          <View className="px-5 pt-4 pb-2">
            <Text className="text-sm font-semibold text-muted uppercase tracking-wide">Settings</Text>
          </View>

          <View className="px-5 py-3 flex-row items-center justify-between border-b border-border">
            <View className="flex-row items-center gap-3">
              <IconSymbol name="bell.fill" size={20} color={colors.primary} />
              <Text className="text-sm text-foreground">Notifications</Text>
            </View>
            <Switch
              value={profile?.notificationsEnabled ?? true}
              onValueChange={(v) => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                profileUpdate.mutate({ notificationsEnabled: v });
              }}
              trackColor={{ false: colors.border, true: colors.primary + "60" }}
              thumbColor={profile?.notificationsEnabled ? colors.primary : colors.muted}
            />
          </View>

          <View className="px-5 py-3 flex-row items-center justify-between border-b border-border">
            <View className="flex-row items-center gap-3">
              <IconSymbol name="doc.text.fill" size={20} color={colors.primary} />
              <Text className="text-sm text-foreground">Currency</Text>
            </View>
            <Text className="text-sm text-muted">{profile?.currency ?? "USD"}</Text>
          </View>

          <Pressable
            onPress={() => {}}
            style={({ pressed }) => [
              {
                paddingHorizontal: 20,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottomWidth: 0.5,
                borderBottomColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View className="flex-row items-center gap-3">
              <IconSymbol name="shield.fill" size={20} color={colors.primary} />
              <Text className="text-sm text-foreground">Privacy Policy</Text>
            </View>
            <IconSymbol name="chevron.right" size={14} color={colors.muted} />
          </Pressable>

          <Pressable
            onPress={() => {}}
            style={({ pressed }) => [
              {
                paddingHorizontal: 20,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View className="flex-row items-center gap-3">
              <IconSymbol name="doc.text.fill" size={20} color={colors.primary} />
              <Text className="text-sm text-foreground">About SubZero</Text>
            </View>
            <IconSymbol name="chevron.right" size={14} color={colors.muted} />
          </Pressable>
        </View>

        {/* Scan Info */}
        <View className="bg-surface rounded-2xl p-5 border border-border mb-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-foreground">Scans this month</Text>
            <Text className="text-sm font-semibold text-foreground">
              {profile?.scansThisMonth ?? 0} / {isPro ? "∞" : "1"}
            </Text>
          </View>
        </View>

        {/* Sign Out */}
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            {
              backgroundColor: colors.error + "10",
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
              marginBottom: 8,
            },
          ]}
        >
          <Text className="text-error text-base font-semibold">Sign Out</Text>
        </Pressable>

        {/* Version */}
        <Text className="text-xs text-muted text-center mt-4">SubZero v1.0.0</Text>
      </ScrollView>
    </ScreenContainer>
  );
}
