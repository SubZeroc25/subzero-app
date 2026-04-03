import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

interface AppState {
  onboardingComplete: boolean;
  isProUser: boolean;
  connectedGmail: boolean;
  connectedOutlook: boolean;
}

interface AppContextType {
  state: AppState;
  setOnboardingComplete: (v: boolean) => void;
  setConnectedGmail: (v: boolean) => void;
  setConnectedOutlook: (v: boolean) => void;
  refreshProfile: () => void;
}

const defaultState: AppState = {
  onboardingComplete: false,
  isProUser: false,
  connectedGmail: false,
  connectedOutlook: false,
};

const AppContext = createContext<AppContextType>({
  state: defaultState,
  setOnboardingComplete: () => {},
  setConnectedGmail: () => {},
  setConnectedOutlook: () => {},
  refreshProfile: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<AppState>(defaultState);
  const serverDataLoaded = useRef(false);

  const profileQuery = trpc.profile.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Server data always takes priority over cached data
  useEffect(() => {
    if (profileQuery.data) {
      serverDataLoaded.current = true;
      setState({
        onboardingComplete: profileQuery.data.onboardingComplete,
        isProUser: profileQuery.data.plan === "pro",
        connectedGmail: profileQuery.data.connectedGmail,
        connectedOutlook: profileQuery.data.connectedOutlook,
      });
    }
  }, [profileQuery.data]);

  // Load cached state only as initial fallback before server data arrives
  useEffect(() => {
    AsyncStorage.getItem("subzero_app_state").then((cached) => {
      if (cached && !serverDataLoaded.current) {
        try {
          const parsed = JSON.parse(cached);
          setState((prev) => ({ ...prev, ...parsed }));
        } catch {}
      }
    });
  }, []);

  // Persist state changes
  useEffect(() => {
    AsyncStorage.setItem("subzero_app_state", JSON.stringify(state));
  }, [state]);

  const setOnboardingComplete = useCallback((v: boolean) => {
    setState((prev) => ({ ...prev, onboardingComplete: v }));
  }, []);

  const setConnectedGmail = useCallback((v: boolean) => {
    setState((prev) => ({ ...prev, connectedGmail: v }));
  }, []);

  const setConnectedOutlook = useCallback((v: boolean) => {
    setState((prev) => ({ ...prev, connectedOutlook: v }));
  }, []);

  // Use ref-based approach to avoid unstable callback reference
  const profileQueryRef = useRef(profileQuery);
  profileQueryRef.current = profileQuery;

  const refreshProfile = useCallback(() => {
    profileQueryRef.current.refetch();
  }, []);

  return (
    <AppContext.Provider
      value={{ state, setOnboardingComplete, setConnectedGmail, setConnectedOutlook, refreshProfile }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
