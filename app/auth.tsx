import { Text, View, Pressable, Platform, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { startOAuthLogin } from "@/constants/oauth";
import { useAuth } from "@/hooks/use-auth";
import * as Auth from "@/lib/_core/auth";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";

export default function AuthScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isAuthenticated, loading, refresh } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !loading) {
      router.replace("/(tabs)" as any);
    }
  }, [isAuthenticated, loading]);

  const handleLogin = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoggingIn(true);
    try {
      const result = await startOAuthLogin();
      console.log("[Auth] Login result:", result);

      // On native, if WebBrowser.openAuthSessionAsync returned a URL,
      // the deep link handler in oauth/callback.tsx will process it.
      // But we should also handle the case where the URL contains
      // sessionToken directly (from server redirect).
      if (result && Platform.OS !== "web") {
        try {
          const url = new URL(result);
          const sessionToken = url.searchParams.get("sessionToken");
          const userParam = url.searchParams.get("user");

          if (sessionToken) {
            console.log("[Auth] Got session token from auth result");
            await Auth.setSessionToken(sessionToken);

            if (userParam) {
              try {
                const userJson = atob(userParam);
                const userData = JSON.parse(userJson);
                const userInfo: Auth.User = {
                  id: userData.id,
                  openId: userData.openId,
                  name: userData.name,
                  email: userData.email,
                  loginMethod: userData.loginMethod,
                  lastSignedIn: new Date(userData.lastSignedIn || Date.now()),
                };
                await Auth.setUserInfo(userInfo);
              } catch (e) {
                console.error("[Auth] Failed to parse user data:", e);
              }
            }

            // Refresh auth state and navigate
            await refresh();
            router.replace("/(tabs)" as any);
            return;
          }
        } catch (e) {
          console.log("[Auth] Could not parse result URL:", e);
        }
      }

      // On web, the page will redirect, so we don't need to do anything here.
      // On native, if we didn't get a token, the user may have cancelled.
      if (Platform.OS !== "web") {
        setIsLoggingIn(false);
      }
    } catch (e) {
      console.error("Login failed:", e);
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1 px-6 justify-center">
        {/* Logo */}
        <View className="items-center mb-10">
          <View className="w-24 h-24 rounded-3xl bg-primary items-center justify-center mb-6">
            <IconSymbol name="bolt.fill" size={48} color="#FFFFFF" />
          </View>
          <Text className="text-3xl font-bold text-foreground mb-2">
            Sign in to SubZero
          </Text>
          <Text className="text-base text-muted text-center">
            Track and manage all your subscriptions
          </Text>
        </View>

        {/* Login Button */}
        <View className="gap-4 mb-8">
          <Pressable
            onPress={handleLogin}
            disabled={isLoggingIn}
            style={({ pressed }) => [
              {
                backgroundColor: colors.primary,
                paddingVertical: 16,
                borderRadius: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                opacity: pressed || isLoggingIn ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            {isLoggingIn ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <IconSymbol name="person.fill" size={20} color="#FFFFFF" />
            )}
            <Text className="text-white text-base font-semibold">
              {isLoggingIn ? "Signing in..." : "Continue with Manus"}
            </Text>
          </Pressable>
        </View>

        {/* Privacy Note */}
        <View className="items-center gap-3">
          <View className="flex-row items-center gap-2">
            <IconSymbol name="shield.fill" size={16} color={colors.success} />
            <Text className="text-sm text-muted">
              We only read billing-related emails
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <IconSymbol name="lock.fill" size={16} color={colors.success} />
            <Text className="text-sm text-muted">
              Your data is encrypted end-to-end
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View className="items-center mt-12">
          <Text className="text-xs text-muted text-center">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>

        {/* Back */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            { paddingVertical: 16, alignItems: "center", opacity: pressed ? 0.6 : 1, marginTop: 8 },
          ]}
        >
          <Text className="text-primary text-sm font-medium">Back to Home</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
