import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  BookOpen,
  FileText,
  MessageSquare,
  User,
  Upload,
  AlertTriangle,
  Users,
  BarChart3,
  Bell,
  Settings,
  Menu,
  X,
  LogOut,
  GraduationCap,
  ClipboardCheck,
  FileQuestion,
  ShieldAlert,
  FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BASE_URL } from "@/components/api/api";
import { clearSession, getCachedUser, getSession, SessionUser } from "@/lib/auth";
import { usePolling } from "@/lib/usePolling";

interface NavItem {
  icon: typeof Home;
  label: string;
  href: string;
}

interface DashboardLayoutProps {
  children: ReactNode;
  role: "student" | "teacher" | "admin";
  /** Stop background notification requests (used on the test-taking screen). */
  pausePolling?: boolean;
  /** Ignored. The name now always comes from the logged-in user (kept so existing pages still compile). */
  userName?: string;
}

const studentNav: NavItem[] = [
  { icon: Home,          label: "Dashboard",   href: "/student" },
  { icon: BookOpen,      label: "All Courses",  href: "/student/enrollment" },
  { icon: FileText,      label: "Assignments",  href: "/student/assignments" },
  { icon: FolderOpen,    label: "Materials",    href: "/student/materials" },
  { icon: ClipboardCheck,label: "Take Test",    href: "/student/test" },
  // { icon: ShieldAlert,   label: "Warnings",     href: "/student/warnings" },
  // { icon: User,          label: "Profile",      href: "/student/profile" },
];

const teacherNav: NavItem[] = [
  { icon: Home,        label: "Dashboard",    href: "/teacher" },
  { icon: BookOpen,    label: "My Courses",   href: "/teacher/courses" },
  { icon: FileText,    label: "Assignments",  href: "/teacher/assignments" },
  { icon: GraduationCap, label: "Enrollments", href: "/teacher/enrollments" },
  { icon: FileText,    label: "Grading",      href: "/teacher/grading" },
  { icon: FileQuestion,label: "Tests",        href: "/teacher/tests" },
];

const adminNav: NavItem[] = [
  { icon: Home,     label: "Dashboard",    href: "/admin" },
  { icon: Users,    label: "Users",        href: "/admin/users" },
  { icon: BookOpen, label: "Courses",      href: "/admin/courses" },
  // { icon: BarChart3, label: "Analytics",    href: "/admin/analytics" },
  { icon: AlertTriangle, label: "Warnings",href: "/admin/warnings" },
  { icon: FileText, label: "Tests",href: "/admin/tests" }, 
  // { icon: Settings, label: "Settings",     href: "/admin/settings" },
];

const navByRole   = { student: studentNav, teacher: teacherNav, admin: adminNav };
const roleLabels  = { student: "Student Portal", teacher: "Teacher Portal", admin: "Admin Console" };

// ── Hook: fetch unread warning count for the student sidebar badge ────────────
function useUnreadWarnings(role: string, paused = false) {
  const [count, setCount] = useState(0);

  const fetch_ = async () => {
      try {
        // The login cookie is sent automatically (see lib/auth.ts)
        const res = await fetch(`${BASE_URL}/notifications/warnings/unread-count`);
        if (res.ok) {
          const data = await res.json();
          setCount(data.total_unread ?? 0);
        }
      } catch { /* silent */ }
    };

  // Every 30 s while the tab is visible; skipped for non-students and while paused
  usePolling(fetch_, 30000, role === "student" && !paused);

  return count;
}

// ── Hook: the logged-in user (same on every page) ────────────────────────────
// The role and name come from the backend (GET /users/me, cached in lib/auth.ts)
// because the login cookie cannot be read by JavaScript.
function useCurrentUser(fallbackRole: string) {
  const [user, setUser] = useState<SessionUser | null>(getCachedUser());

  useEffect(() => {
    let cancelled = false;
    getSession().then((me) => {
      if (me && !cancelled) setUser(me);
    });
    return () => { cancelled = true; };
  }, []);

  return {
    name: user?.full_name || user?.username || "",
    role: user?.role || fallbackRole,
  };
}

export function DashboardLayout({ children, role, pausePolling = false }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location                      = useLocation();
  const navItems                      = navByRole[role];
  const unreadWarnings                = useUnreadWarnings(role, pausePolling);
  const currentUser                   = useCurrentUser(role);

  const navigate                      = useNavigate();

  const handleLogout = async () => {
    await clearSession();       // revokes the session on the server and clears the cookies
    navigate("/login", { replace: true });
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px_hsl(142_76%_45%_/_0.3)]">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display font-bold text-lg text-sidebar-foreground">NACOS CONNECT '26</h1>
                <p className="text-xs text-muted-foreground">{roleLabels[role]}</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive   = location.pathname === item.href;
              const isExternal = item.href.startsWith("https");
              const isWarnings = item.href === "/student/warnings";
              const showBadge  = isWarnings && unreadWarnings > 0;

              const LinkComponent = isExternal ? "a" : Link;
              const linkProps     = isExternal
                ? { href: item.href, target: "_blank", rel: "noopener noreferrer" }
                : { to: item.href };

              return (
                <LinkComponent
                  key={item.href}
                  {...linkProps as any}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300",
                    isActive
                      ? "bg-primary/10 text-primary shadow-[0_0_20px_hsl(142_76%_45%_/_0.1)]"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />
                  {item.label}

                  <div className="ml-auto flex items-center gap-1.5">
                    {/* Unread warnings badge */}
                    {showBadge && (
                      <span className="min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                        {unreadWarnings > 9 ? "9+" : unreadWarnings}
                      </span>
                    )}
                    {/* Active indicator dot */}
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
                    )}
                  </div>
                </LinkComponent>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent/50">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{currentUser.name || "…"}</p>
                <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Log out">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-xl border-b border-border flex items-center px-4 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden mr-4"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* Only show NotificationBell for students */}
            {role === "student" && <NotificationBell pausePolling={pausePolling} />}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile close button */}
      {sidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 right-4 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}