import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import type { NotificationItem } from "../types";

type NotificationContextType = {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  createNotification: (input: {
    title: string;
    message: string;
    link?: string | null;
    type?: string;
  }) => Promise<void>;
  refreshNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshNotifications = async () => {
    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setNotifications((data ?? []) as NotificationItem[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void refreshNotifications();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void refreshNotifications();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const value = useMemo<NotificationContextType>(
    () => ({
      notifications,
      unreadCount: notifications.filter((notification) => !notification.read).length,
      isLoading,
      markAsRead: async (id) => {
        const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
        if (error) throw error;
        setNotifications((current) =>
          current.map((notification) =>
            notification.id === id ? { ...notification, read: true } : notification,
          ),
        );
      },
      markAllAsRead: async () => {
        if (!user) return;
        const { error } = await supabase
          .from("notifications")
          .update({ read: true })
          .eq("user_id", user.id)
          .eq("read", false);

        if (error) throw error;
        setNotifications((current) =>
          current.map((notification) => ({ ...notification, read: true })),
        );
      },
      createNotification: async ({ title, message, link = null, type = "info" }) => {
        if (!user) return;
        const { error } = await supabase.from("notifications").insert({
          user_id: user.id,
          title,
          message,
          link,
          type,
        });
        if (error) throw error;
      },
      refreshNotifications,
    }),
    [isLoading, notifications, user],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
