import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { ThemeMode, UserProfile } from "../types";

type AuthContextValue = {
  user: UserProfile | null;
  session: Session | null;
  isAuthed: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerEmail: (email: string, password: string, name: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (payload: Partial<UserProfile>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function ensureProfile(session: Session) {
  const authUser = session.user;

  const profileDefaults = {
    id: authUser.id,
    email: authUser.email ?? "",
    full_name:
      (authUser.user_metadata.full_name as string | undefined) ??
      (authUser.user_metadata.name as string | undefined) ??
      null,
    avatar_url: (authUser.user_metadata.avatar_url as string | undefined) ?? null,
    theme: "dark" as ThemeMode,
  };

  await supabase.from("profiles").upsert(profileDefaults, { onConflict: "id" });
}

async function getProfile(userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data as UserProfile;
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = async () => {
    const currentSession = session ?? (await supabase.auth.getSession()).data.session;
    if (!currentSession?.user) {
      setUser(null);
      return;
    }

    await ensureProfile(currentSession);
    const profile = await getProfile(currentSession.user.id);
    setUser(profile);
    applyTheme(profile.theme);
  };

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session);
        if (data.session?.user) {
          await ensureProfile(data.session);
          const profile = await getProfile(data.session.user.id);
          if (!mounted) return;
          setUser(profile);
          applyTheme(profile.theme);
        } else {
          const savedTheme = (localStorage.getItem("theme") as ThemeMode | null) ?? "dark";
          applyTheme(savedTheme);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession?.user) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      window.setTimeout(() => {
        void refreshProfile().finally(() => setIsLoading(false));
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isAuthed: Boolean(session?.user && user),
      isLoading,
      loginWithGoogle: async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/`,
            queryParams: {
              prompt: "select_account",
            },
          },
        });
        if (error) throw error;
      },
      logout: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setUser(null);
        setSession(null);
      },
      loginWithEmail: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      registerEmail: async (email, password, name) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              avatar_url: null,
            },
          },
        });
        if (error) throw error;
      },
      refreshProfile,
      updateProfile: async (payload) => {
        if (!user) throw new Error("No authenticated user");

        const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
        if (error) throw error;

        const nextProfile = { ...user, ...payload } as UserProfile;
        setUser(nextProfile);

        if (payload.theme) {
          applyTheme(payload.theme);
        }
      },
    }),
    [isLoading, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
  