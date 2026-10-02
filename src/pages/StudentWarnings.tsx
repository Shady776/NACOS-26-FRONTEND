import { useState, useEffect } from "react";
import { ShieldAlert, BookOpen, Clock, Loader2, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { BASE_URL } from "@/components/api/api";

const StudentWarnings = () => {
  const [warnings, setWarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchWarnings();
  }, []);

  const fetchWarnings = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const payload = JSON.parse(atob(token!.split(".")[1]));
      const studentId = payload.sub ?? payload.user_id ?? payload.id;

      const res = await fetch(`${BASE_URL}/warnings/student/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch warnings");

      const data = await res.json();
      const list: any[] = Array.isArray(data) ? data : data.warnings || [];
      // Sort newest first
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setWarnings(list);

      // Auto-expand all courses on load
      const courseIds = new Set<string>(list.map((w: any) => w.course_id));
      setExpandedCourses(courseIds);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelative = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(dateString);
  };

  const toggleCourse = (courseId: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  // Group warnings by course_id
  const grouped = warnings.reduce((acc: Record<string, any[]>, warning) => {
    const key = warning.course_id || "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(warning);
    return acc;
  }, {});

  const courseGroups = Object.entries(grouped) as [string, any[]][];

  if (loading) {
    return (
      <DashboardLayout role="student" userName="Student">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Loading warnings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student" userName="Student">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .anim-up { animation: fadeInUp 0.5s ease-out forwards; opacity: 0; }
        .anim-in { animation: fadeIn 0.3s ease-out forwards; opacity: 0; }
      `}</style>

      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="anim-up" style={{ animationDelay: "0ms" }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <ShieldAlert size={22} className="text-yellow-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Warnings</h1>
              <p className="text-sm text-muted-foreground">
                {warnings.length === 0
                  ? "You have no warnings"
                  : `${warnings.length} warning${warnings.length !== 1 ? "s" : ""} across ${courseGroups.length} course${courseGroups.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="anim-in bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
            <AlertTriangle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Empty state */}
        {warnings.length === 0 && !error && (
          <div
            className="anim-up bg-card border border-border rounded-2xl p-16 text-center"
            style={{ animationDelay: "100ms" }}
          >
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">All clear!</h3>
            <p className="text-sm text-muted-foreground">
              You have no warnings from any of your courses.
            </p>
          </div>
        )}

        {/* Grouped by course */}
        {courseGroups.map(([courseId, courseWarnings], groupIdx) => {
          const isExpanded = expandedCourses.has(courseId);
          // Use course_code from first warning if available
          const courseCode = courseWarnings[0]?.course_code || "Unknown Course";
          const courseName = courseWarnings[0]?.course_name || null;

          return (
            <div
              key={courseId}
              className="anim-up bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
              style={{ animationDelay: `${(groupIdx + 1) * 100}ms` }}
            >
              {/* Course header — clickable to expand/collapse */}
              <button
                onClick={() => toggleCourse(courseId)}
                className="w-full flex items-center justify-between p-5 hover:bg-secondary/40 transition-colors duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                    <BookOpen size={18} className="text-yellow-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-foreground text-sm">{courseCode}</p>
                    {courseName && (
                      <p className="text-xs text-muted-foreground">{courseName}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full border border-yellow-200">
                    {courseWarnings.length} warning{courseWarnings.length !== 1 ? "s" : ""}
                  </span>
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-muted-foreground" />
                  ) : (
                    <ChevronDown size={16} className="text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Warning items */}
              {isExpanded && (
                <div className="border-t border-border divide-y divide-border/50">
                  {courseWarnings.map((warning, idx) => (
                    <div
                      key={warning.id}
                      className="anim-in px-5 py-4 hover:bg-secondary/30 transition-colors duration-200"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-yellow-50 border border-yellow-200 flex items-center justify-center shrink-0 mt-0.5">
                          <AlertTriangle size={15} className="text-yellow-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground mb-0.5">
                            Warning from your teacher
                          </p>
                          <p className="text-sm text-foreground/80 leading-relaxed">
                            {warning.reason}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <Clock size={11} className="text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatRelative(warning.created_at)}
                            </span>
                            <span className="text-muted-foreground/40 text-xs">•</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(warning.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
};

export default StudentWarnings;