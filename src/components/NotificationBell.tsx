import { useState, useEffect, useRef } from "react";
import { Bell, X, CheckCheck, BookOpen, FileText, Award, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "@/components/api/api";
import { usePolling } from "@/lib/usePolling";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "test_activated" | "assignment_created" | "assignment_updated" | "assignment_graded" | "warning";
  title: string;
  message: string;
  assignment_id: string | null;
  test_id: string | null;
  course_id: string | null;
  is_read: boolean;
  created_at: string;
}

const typeIcon = (type: Notification["type"]) => {
  switch (type) {
    case "test_activated":    return <Zap size={14} className="text-amber-500" />;
    case "assignment_created": return <BookOpen size={14} className="text-primary" />;
    case "assignment_updated": return <FileText size={14} className="text-blue-500" />;
    case "assignment_graded":  return <Award size={14} className="text-green-500" />;
    default:                   return <Bell size={14} className="text-muted-foreground" />;
  }
};

const typeColor = (type: Notification["type"]) => {
  switch (type) {
    case "test_activated":     return "bg-amber-500/10";
    case "assignment_created": return "bg-primary/10";
    case "assignment_updated": return "bg-blue-500/10";
    case "assignment_graded":  return "bg-green-500/10";
    default:                   return "bg-muted";
  }
};

const formatTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export function NotificationBell({ pausePolling = false }: { pausePolling?: boolean }) {
  const [open, setOpen]                   = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread]               = useState(0);
  const ref                               = useRef<HTMLDivElement>(null);
  const navigate                          = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res  = await fetch(`${BASE_URL}/notifications/my`);
      if (!res.ok) return;
      const data: Notification[] = await res.json();
      setNotifications(data);
      setUnread(data.filter((n) => !n.is_read).length);
    } catch { /* silent */ }
  };

  // Every 30 s while the tab is visible (and not paused, e.g. during a test)
  usePolling(fetchNotifications, 30000, !pausePolling);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markRead = async (id: string) => {
    await fetch(`${BASE_URL}/notifications/${id}/read`, { method: "PATCH" });
  };

  const markAllRead = async () => {
    await fetch(`${BASE_URL}/notifications/read-all`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  };

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      await markRead(n.id);
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
      );
      setUnread((u) => Math.max(0, u - 1));
    }

    // Navigate with search pre-fill
    if (n.type === "test_activated" && n.test_id) {
      navigate("/student/test");
    } else if (n.assignment_id) {
      // encode the assignment title for the search bar pre-fill
      const title = notifications.find((x) => x.id === n.id)?.title ?? "";
      navigate(`/student/assignments?notif=${encodeURIComponent(n.assignment_id)}`);
    }

    setOpen(false);
  };

  const dismiss = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await fetch(`${BASE_URL}/notifications/${id}`, { method: "DELETE" });
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      setUnread(updated.filter((n) => !n.is_read).length);
      return updated;
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full mt-2 w-96 max-h-[480px] bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">Notifications</span>
                {unread > 0 && (
                  <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                    {unread} new
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CheckCheck size={13} />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <Bell size={32} className="text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">No new notifications</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-secondary/60 border-b border-border/50 last:border-0",
                      !n.is_read && "bg-primary/5"
                    )}
                  >
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", typeColor(n.type))}>
                      {typeIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs leading-relaxed", !n.is_read ? "text-foreground font-medium" : "text-muted-foreground")}>
                        {n.message}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">{formatTime(n.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!n.is_read && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      )}
                      <button
                        onClick={(e) => dismiss(e, n.id)}
                        className="p-0.5 rounded hover:bg-secondary text-muted-foreground/50 hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="Dismiss"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}