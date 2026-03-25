import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";

export function Notifications() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen((open) => !open)}
        className="relative size-9 rounded-lg bg-slate-100 text-slate-600 transition-colors dark:bg-slate-900 dark:text-slate-300"
        aria-label="Abrir notificaciones"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <div className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount}
          </div>
        )}
      </button>
      {isOpen && (
        <div className="absolute left-[calc(100%-18rem)] z-[65] mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950 sm:right-0 sm:w-80 sm:max-w-80">
          <div className="relative border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-blue-100">Notificaciones</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-2 top-2 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-blue-100 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="Cerrar notificaciones"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
            <button
              onClick={() => void markAllAsRead()}
              className="mt-2 text-xs font-medium text-primary hover:underline"
            >
              Marcar todo como leído
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <p className="p-4 text-sm text-slate-500">Cargando notificaciones...</p>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No hay notificaciones.</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border-b border-slate-200 p-4 text-sm dark:border-slate-800 ${
                    notification.read ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold">{notification.title}</p>
                      <p>{notification.message}</p>
                    </div>
                    {!notification.read && (
                      <button
                        onClick={() => void markAsRead(notification.id)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Leer
                      </button>
                    )}
                  </div>
                  {notification.link ? (
                    <Link
                      to={notification.link}
                      onClick={() => {
                        void markAsRead(notification.id);
                        setIsOpen(false);
                      }}
                      className="mt-3 inline-flex text-xs font-medium text-primary hover:underline"
                    >
                      Ir a detalle
                    </Link>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
