import { useState, useEffect, useRef } from "react";
import { Calendar, GraduationCap, BookOpen, FileText, AlertCircle, Bell, X, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { BASE_URL } from "@/components/api/api";

// Spinner component
const Spinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
      <p className="text-muted-foreground font-medium">Loading dashboard...</p>
    </div>
  </div>
);

// StatCard Component
const StatCard = ({ stat, index }: { stat: any; index: number }) => (
  <div
    className="bg-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-border hover:shadow-md transition-all duration-300 group opacity-0 animate-fade-in-up cursor-pointer"
    style={{
      animationDelay: `${index * 100}ms`,
      animationFillMode: "forwards",
    }}
  >
    <div className="flex justify-between items-start mb-3 sm:mb-4">
      <div
        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg`}
        style={{
          boxShadow: '0 0 15px rgba(16, 185, 129, 0.2), 0 0 30px rgba(16, 185, 129, 0.1)'
        }}
      >
        <stat.icon size={20} className="sm:w-6 sm:h-6" />
      </div>
      <span
        className={`text-xs font-bold px-2 py-1 rounded-full transition-all duration-300 ${
          stat.trend === "Urgent" ? "bg-red-50 text-red-600" : "bg-secondary text-muted-foreground"
        }`}
      >
        {stat.trend}
      </span>
    </div>
    <div>
      <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 transition-all duration-300 group-hover:scale-105">
        {stat.value}
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground font-medium">{stat.label}</p>
    </div>
  </div>
);

// GradeItem Component
const GradeItem = ({ grade, index }: { grade: any; index: number }) => (
  <div
    className="flex justify-between items-center border-b border-border/50 pb-3 last:border-0 last:pb-0 opacity-0 animate-fade-in cursor-pointer hover:bg-secondary/50 -mx-2 px-2 py-2 rounded-lg transition-all duration-300"
    style={{
      animationDelay: `${index * 50}ms`,
      animationFillMode: "forwards",
    }}
  >
    <div className="flex-1 min-w-0">
      <h4 className="font-bold text-foreground text-sm">{grade.course_code}</h4>
      <p className="text-xs text-muted-foreground truncate">{grade.assignment_title}</p>
    </div>
    <div className="text-right ml-4">
      <span className="block font-bold text-foreground">{grade.grade}</span>
      <span className="text-xs text-muted-foreground">{grade.score}%</span>
    </div>
  </div>
);

// Calendar Modal Component
const CalendarModal = ({ isOpen, onClose, deadlines }: { isOpen: boolean; onClose: () => void; deadlines: any[] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const getDeadlinesForDay = (day: number | null) => {
    if (!day) return [];
    // Build a local date string to avoid timezone offset issues
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return deadlines.filter((d) => {
      if (!d.due_date) return false;
      // Normalise: take only the date portion regardless of time/timezone suffix
      const deadlineDatePart = d.due_date.substring(0, 10);
      return deadlineDatePart === dateStr;
    });
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-scale-in cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border p-4 sm:p-5 flex justify-between items-center rounded-t-2xl sm:rounded-t-3xl">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">Calendar View</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:rotate-90 cursor-pointer p-1 hover:bg-secondary rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto max-h-[calc(90vh-72px)] sm:max-h-[calc(85vh-80px)]">
          <div className="flex justify-between items-center mb-4 sm:mb-5">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-secondary rounded-lg transition-all duration-300 cursor-pointer hover:scale-110"
            >
              <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
            </button>
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              {monthNames[month]} {year}
            </h3>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-secondary rounded-lg transition-all duration-300 cursor-pointer hover:scale-110"
            >
              <ChevronRight size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-[10px] sm:text-xs font-bold text-muted-foreground py-1 sm:py-2">
                {day}
              </div>
            ))}

            {days.map((day, idx) => {
              const dayDeadlines = getDeadlinesForDay(day);
              const isToday =
                day === new Date().getDate() &&
                month === new Date().getMonth() &&
                year === new Date().getFullYear();

              return (
                <div
                  key={idx}
                  className={`min-h-14 sm:min-h-20 border border-border rounded-md sm:rounded-lg p-1 sm:p-2 transition-all duration-300 ${
                    day ? "bg-card hover:bg-secondary cursor-pointer hover:shadow-sm" : "bg-secondary/50"
                  } ${isToday ? "ring-2 ring-primary" : ""}`}
                >
                  {day && (
                    <>
                      <div
                        className={`text-xs sm:text-sm font-bold mb-1 ${
                          isToday ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {day}
                      </div>
                      <div className="space-y-0.5 sm:space-y-1">
                        {dayDeadlines.slice(0, 2).map((deadline, i) => (
                          <div
                            key={i}
                            className="text-[9px] sm:text-xs bg-red-50 text-red-700 px-1 sm:px-1.5 py-0.5 rounded truncate border border-red-100 transition-all duration-300 hover:bg-red-100"
                            title={`${deadline.course_code}: ${deadline.title}`}
                          >
                            {deadline.course_code}
                          </div>
                        ))}
                        {dayDeadlines.length > 2 && (
                          <div className="text-[8px] sm:text-[10px] text-muted-foreground text-center">
                            +{dayDeadlines.length - 2}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          {deadlines.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Upcoming Deadlines</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {deadlines.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                    <span className="font-medium text-foreground">{d.course_code}</span>
                    <span className="text-muted-foreground truncate">{d.title}</span>
                    <span className="ml-auto text-muted-foreground shrink-0">
                      {d.due_date ? d.due_date.substring(0, 10) : "TBD"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Warning Banner Component
const WarningBanner = ({ warnings, onDismiss }: { warnings: any[]; onDismiss: (id: any) => void }) => {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnings.map((warning: any) => (
        <div
          key={warning.id}
          className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl animate-fade-in-up"
        >
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-yellow-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">Warning from your teacher</p>
            {warning.reason && (
              <p className="text-xs mt-0.5 text-yellow-700 leading-relaxed">{warning.reason}</p>
            )}
            {warning.created_at && (
              <p className="text-xs mt-1 text-yellow-500">
                {new Date(warning.created_at).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                  hour: "2-digit", minute: "2-digit"
                })}
              </p>
            )}
          </div>
          <button
            onClick={() => onDismiss(warning.id)}
            className="shrink-0 text-yellow-500 hover:text-yellow-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

const StudentDashboard = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [dismissedWarnings, setDismissedWarnings] = useState<any[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem("dismissedWarnings") || "[]");
    } catch { return []; }
  });
  const warningsFetched = useRef(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch(`${BASE_URL}/dashboard/student`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const data = await response.json();
      setDashboardData(data);
      setLoading(false);

      // Decode student ID from JWT token payload — guard against double fetch
      if (!warningsFetched.current) {
        warningsFetched.current = true;
        try {
          const payload = JSON.parse(atob(token!.split(".")[1]));
          const studentId = payload.sub ?? payload.user_id ?? payload.id ?? null;
          if (studentId) fetchWarnings(studentId, token);
        } catch {
          console.warn("Could not decode student ID from token");
        }
      }
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      setError(error.message);
      setLoading(false);
    }
  };

  const fetchWarnings = async (studentId: string | number, token: string | null) => {
    try {
      const res = await fetch(`${BASE_URL}/warnings/student/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.warnings || [];
        // Only show the most recent warning
        setWarnings(list.slice(0, 1));
      }
    } catch (err) {
      console.error("Error fetching warnings:", err);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "TBD";
    // Use the date portion only to avoid timezone shifting the displayed day
    const [year, month, day] = dateString.substring(0, 10).split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatDaysUntil = (days: number | null) => {
    if (days === null || days === undefined) return "None";
    if (days === 0) return "Today";
    if (days === 1) return "1 Day";
    return `${days} Days`;
  };

  const getPriorityClass = (dateString: string) => {
    if (!dateString) return "medium";
    const [year, month, day] = dateString.substring(0, 10).split("-").map(Number);
    const due = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff <= 2 ? "high" : "medium";
  };

  const handleDismissWarning = (id: any) => {
    setDismissedWarnings((prev) => {
      const updated = [...prev, id];
      sessionStorage.setItem("dismissedWarnings", JSON.stringify(updated));
      return updated;
    });
  };

  if (loading) {
    return (
      <DashboardLayout role="student" userName="Student">
        <Spinner />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout role="student" userName="Student">
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg animate-fade-in">
            Error: {error}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const stats = [
    {
      label: "Average Score",
      value: `${dashboardData.stats.average_score}%`,
      icon: GraduationCap,
      color: "text-green-500",
      bg: "bg-green-500/10",
      trend: "Score",
    },
    {
      label: "Enrolled Courses",
      value: dashboardData.stats.enrolled_count.toString(),
      icon: BookOpen,
      color: "text-green-500",
      bg: "bg-green-500/10",
      trend: "Active",
    },
    {
      label: "Pending Assignments",
      value: dashboardData.stats.pending_assignments.toString(),
      icon: FileText,
      color: "text-green-500",
      bg: "bg-green-500/10",
      trend: dashboardData.stats.pending_assignments > 0 ? "Urgent" : "None",
    },
    {
      label: "Next Deadline",
      value: formatDaysUntil(dashboardData.stats.next_deadline_days),
      icon: AlertCircle,
      color: "text-green-500",
      bg: "bg-green-500/10",
      trend: "Prepare",
    },
  ];

  // Filter out dismissed warnings
  const activeWarnings = warnings.filter(
    (w: any) => !dismissedWarnings.includes(w.id)
  );

  return (
    <DashboardLayout role="student" userName="Student">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.6s ease-out; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        .animate-scale-in { animation: scaleIn 0.3s ease-out; }
      `}</style>

      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Calendar Modal */}
        <CalendarModal
          isOpen={showCalendar}
          onClose={() => setShowCalendar(false)}
          deadlines={dashboardData.upcoming_deadlines || []}
        />

        {/* Warning Banners */}
        {activeWarnings.length > 0 && (
          <WarningBanner warnings={activeWarnings} onDismiss={handleDismissWarning} />
        )}

        {/* Top Stats Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {stats.map((stat, idx) => (
            <StatCard key={stat.label} stat={stat} index={idx} />
          ))}
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Recent Grades */}
            <section
              className="bg-card p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-border opacity-0 animate-fade-in-up"
              style={{ animationDelay: "400ms", animationFillMode: "forwards" }}
            >
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-base sm:text-lg font-bold text-foreground">Recent Grades</h2>
                <a
                  href="/student/grades"
                  className="text-xs text-muted-foreground hover:text-foreground transition-all duration-300 cursor-pointer hover:scale-105"
                >
                  View All
                </a>
              </div>
              {dashboardData.recent_grades.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No grades yet</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {dashboardData.recent_grades.map((grade: any, idx: number) => (
                    <GradeItem key={idx} grade={grade} index={idx} />
                  ))}
                </div>
              )}
            </section>

            {/* Timetable Section */}
            <section
              className="bg-card p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-border opacity-0 animate-fade-in-up"
              style={{ animationDelay: "500ms", animationFillMode: "forwards" }}
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-2 sm:gap-3">
                <h2 className="text-base sm:text-xl font-bold text-foreground">Today's Timetable</h2>
                <div className="text-xs sm:text-sm text-muted-foreground bg-secondary px-2 sm:px-3 py-1 rounded-full border border-border flex items-center gap-2 self-start sm:self-auto">
                  <Calendar size={12} className="sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">
                    {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span className="sm:hidden">
                    {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
              {dashboardData.timetable.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No timetable data</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-[600px] px-4 sm:px-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                          <th className="pb-3 sm:pb-4 font-semibold pl-2 sm:pl-4">Time</th>
                          <th className="pb-3 sm:pb-4 font-semibold">Course Details</th>
                          <th className="pb-3 sm:pb-4 font-semibold">Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {dashboardData.timetable.map((slot: any, idx: number) => (
                          <tr key={idx} className="group hover:bg-secondary/50 transition-all duration-300 cursor-pointer">
                            <td className="py-3 sm:py-4 pl-2 sm:pl-4 font-semibold text-foreground text-sm w-24 sm:w-32">
                              {slot.time}
                            </td>
                            <td className="py-3 sm:py-4">
                              <div className="font-bold text-sm text-foreground">{slot.course_code}</div>
                              <div className="text-xs text-muted-foreground">{slot.subject}</div>
                            </td>
                            <td className="py-3 sm:py-4 text-foreground/70 text-xs sm:text-sm">
                              <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-muted-foreground/30"></div> {slot.location}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar — Deadlines only */}
          <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Upcoming Deadlines */}
            <section
              className="bg-card p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-border relative overflow-hidden opacity-0 animate-fade-in-up"
              style={{ animationDelay: "600ms", animationFillMode: "forwards" }}
            >
              <div className="absolute top-0 right-0 w-20 h-20 sm:w-24 sm:h-24 bg-red-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                  <h2 className="text-base sm:text-lg font-bold text-foreground">Deadlines</h2>
                  <Calendar size={16} className="sm:w-4.5 sm:h-4.5 text-muted-foreground" />
                </div>
                {dashboardData.upcoming_deadlines.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {dashboardData.upcoming_deadlines.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex gap-3 sm:gap-4 items-start p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-border/50 hover:border-red-100 hover:bg-red-50/30 transition-all duration-300 cursor-pointer group hover:shadow-sm"
                      >
                        <div
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl shrink-0 flex flex-col items-center justify-center text-xs font-bold transition-transform duration-300 group-hover:scale-110 ${
                            getPriorityClass(item.due_date) === "high"
                              ? "bg-red-100 text-red-600"
                              : "bg-amber-100 text-amber-600"
                          }`}
                        >
                          {(() => {
                            const [y, m, d] = (item.due_date || "").substring(0, 10).split("-").map(Number);
                            const date = new Date(y, m - 1, d);
                            return (
                              <>
                                <span>{date.getDate()}</span>
                                <span className="text-[8px] uppercase">
                                  {date.toLocaleDateString("en-US", { month: "short" })}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-foreground text-sm group-hover:text-red-700 transition-colors truncate">
                            {item.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <span className="font-semibold text-foreground/80">{item.course_code}</span> •
                            <span className={getPriorityClass(item.due_date) === "high" ? "text-red-500 font-medium" : ""}>
                              {formatDate(item.due_date)}
                            </span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  onClick={() => setShowCalendar(true)}
                  variant="outline"
                  className="w-full mt-6 hover:scale-105 transition-transform"
                >
                  View Calendar
                </Button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;