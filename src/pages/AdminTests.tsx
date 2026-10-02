import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  ClipboardList,
  Search,
  Loader2,
  RefreshCw,
  Users,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  Download,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BASE_URL } from "@/components/api/api";

/* ── CSV Export Helper ────────────────────────────────────────────────────── */
const exportToCSV = ({ students, testTitle, courseCode, totalMarks }) => {
  const headers = [
    "Student Name",
    "Username",
    "Matric Number",
    "Department",
    "Status",
    "Score",
    `Score / ${totalMarks ?? "?"}`,
    "Percentage (%)",
    "Submitted At",
  ];

  const rows = students.map((s) => {
    const score = s.score ?? "";
    const pct =
      s.score != null && totalMarks
        ? Math.round((s.score / totalMarks) * 100)
        : "";
    const status = s.has_attempted ? s.attempt_status || "attempted" : "Not Attempted";
    const submittedAt = s.submitted_at
      ? new Date(s.submitted_at).toLocaleString()
      : "";

    return [
      s.student_name || s.student_username || "",
      s.student_username || "",
      s.matric_number || "",
      s.department || "",
      status,
      score,
      score !== "" ? `${score}/${totalMarks ?? "?"}` : "",
      pct !== "" ? `${pct}%` : "",
      submittedAt,
    ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`);
  });

  const csvContent = [headers.map((h) => `"${h}"`), ...rows]
    .map((r) => r.join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeTitle = (testTitle || "test").replace(/[^a-z0-9]/gi, "_");
  const safeCode = (courseCode || "course").replace(/[^a-z0-9]/gi, "_");
  link.href = url;
  link.download = `${safeCode}_${safeTitle}_results.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

/* ── Status helpers ───────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  graded: {
    label: "Graded",
    icon: CheckCircle2,
    className: "text-primary border-primary/30 bg-primary/5",
  },
  submitted: {
    label: "Submitted",
    icon: Clock,
    className: "text-blue-500 border-blue-400/30 bg-blue-500/5",
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    className: "text-yellow-500 border-yellow-400/30 bg-yellow-500/5",
  },
  invalidated: {
    label: "Invalidated",
    icon: XCircle,
    className: "text-destructive border-destructive/30 bg-destructive/5",
  },
  expired: {
    label: "Expired",
    icon: XCircle,
    className: "text-orange-500 border-orange-400/30 bg-orange-500/5",
  },
};

const getStatusConfig = (status) =>
  STATUS_CONFIG[status?.toLowerCase()] || {
    label: status || "Unknown",
    icon: Clock,
    className: "text-muted-foreground border-border",
  };

const ScorePill = ({ score, total }) => {
  if (score == null) return <span className="text-muted-foreground text-xs italic">Pending</span>;
  const pct = total ? Math.round((score / total) * 100) : 0;
  const color =
    pct >= 70 ? "text-primary" : pct >= 50 ? "text-yellow-500" : "text-destructive";
  return (
    <span className={`font-semibold text-sm ${color}`}>
      {score}/{total}{" "}
      <span className="text-xs font-normal text-muted-foreground">({pct}%)</span>
    </span>
  );
};

/* ── Component ────────────────────────────────────────────────────────────── */
const AdminTests = () => {
  const [adminName, setAdminName] = useState("");
  const [courses, setCourses] = useState([]);
  const [tests, setTests] = useState([]);
  const [studentsStatus, setStudentsStatus] = useState([]);
  const [statistics, setStatistics] = useState(null);

  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedTest, setSelectedTest] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingTests, setLoadingTests] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const token = () => localStorage.getItem("access_token");
  const authHeader = () => ({ Authorization: `Bearer ${token()}` });

  /* ── Initial load ────────────────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/users/me`, { headers: authHeader() });
        if (res.ok) {
          const d = await res.json();
          setAdminName(d.full_name || d.username);
        }
      } catch (_) {}

      try {
        setLoadingCourses(true);
        const res = await fetch(`${BASE_URL}/admin/courses?limit=200`, {
          headers: authHeader(),
        });
        if (res.ok) setCourses(await res.json());
      } catch (_) {
      } finally {
        setLoadingCourses(false);
      }
    })();
  }, []);

  /* ── When course changes, load tests ────────────────────────────────── */
  useEffect(() => {
    if (!selectedCourse) {
      setTests([]);
      setSelectedTest("");
      setStudentsStatus([]);
      setStatistics(null);
      return;
    }
    (async () => {
      setLoadingTests(true);
      setSelectedTest("");
      setStudentsStatus([]);
      setStatistics(null);
      try {
        const res = await fetch(`${BASE_URL}/tests/course/${selectedCourse}`, {
          headers: authHeader(),
        });
        if (res.ok) setTests(await res.json());
        else setTests([]);
      } catch (_) {
        setTests([]);
      } finally {
        setLoadingTests(false);
      }
    })();
  }, [selectedCourse]);

  /* ── When test changes, load students + stats ────────────────────────── */
  useEffect(() => {
    if (!selectedTest) {
      setStudentsStatus([]);
      setStatistics(null);
      return;
    }
    (async () => {
      setLoadingStudents(true);
      try {
        const [statusRes, statsRes] = await Promise.all([
          fetch(`${BASE_URL}/tests/${selectedTest}/students-status`, {
            headers: authHeader(),
          }),
          fetch(`${BASE_URL}/tests/${selectedTest}/statistics`, {
            headers: authHeader(),
          }),
        ]);
        if (statusRes.ok) setStudentsStatus(await statusRes.json());
        if (statsRes.ok) setStatistics(await statsRes.json());
      } catch (_) {
      } finally {
        setLoadingStudents(false);
      }
    })();
  }, [selectedTest]);

  const selectedTestObj = tests.find((t) => t.id === selectedTest);
  const selectedCourseObj = courses.find((c) => c.id === selectedCourse);

  const filteredStudents = studentsStatus.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      !term ||
      s.student_name?.toLowerCase().includes(term) ||
      s.student_username?.toLowerCase().includes(term) ||
      s.matric_number?.toLowerCase().includes(term) ||
      s.department?.toLowerCase().includes(term)
    );
  });

  const attempted = studentsStatus.filter((s) => s.has_attempted).length;
  const notAttempted = studentsStatus.length - attempted;

  const handleExportCSV = () => {
    exportToCSV({
      students: filteredStudents,
      testTitle: selectedTestObj?.title,
      courseCode: selectedCourseObj?.course_code || selectedCourseObj?.title,
      totalMarks: selectedTestObj?.total_marks,
    });
  };

  return (
    <DashboardLayout role="admin" userName={adminName}>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold">Test Results</h1>
          <p className="text-muted-foreground mt-1">
            Browse test results and student performance across all courses
          </p>
        </div>

        {/* Selectors */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Course selector */}
          <div className="flex-1">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
              Course
            </label>
            {loadingCourses ? (
              <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border text-sm text-muted-foreground">
                <Loader2 size={14} className="animate-spin" /> Loading courses…
              </div>
            ) : (
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select a course…" />
                </SelectTrigger>
                <SelectContent>
                  {courses.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">No courses found</div>
                  ) : (
                    courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.course_code ? `${c.course_code} — ` : ""}
                        {c.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Test selector */}
          <div className="flex-1">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
              Test
            </label>
            {loadingTests ? (
              <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border text-sm text-muted-foreground">
                <Loader2 size={14} className="animate-spin" /> Loading tests…
              </div>
            ) : (
              <Select
                value={selectedTest}
                onValueChange={setSelectedTest}
                disabled={!selectedCourse || tests.length === 0}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue
                    placeholder={
                      !selectedCourse
                        ? "Select a course first"
                        : tests.length === 0
                        ? "No tests in this course"
                        : "Select a test…"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {tests.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* ── Stats cards (only when test selected) ─────────────────────── */}
        {selectedTest && statistics && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {[
              {
                label: "Enrolled",
                value: statistics.total_enrolled ?? studentsStatus.length,
                icon: Users,
                color: "text-foreground",
              },
              {
                label: "Attempted",
                value: attempted,
                icon: ClipboardList,
                color: "text-primary",
              },
              {
                label: "Not Attempted",
                value: notAttempted,
                icon: XCircle,
                color: "text-destructive",
              },
              {
                label: "Average Score",
                value:
                  statistics.average_score != null
                    ? `${Math.round(statistics.average_score)}/${selectedTestObj?.total_marks ?? "?"}`
                    : "—",
                icon: TrendingUp,
                color: "text-blue-500",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-card border border-border/60 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <s.icon size={16} className={s.color} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Student list ──────────────────────────────────────────────── */}
        {selectedTest && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">
                {selectedTestObj?.title}{" "}
                <span className="text-muted-foreground font-normal text-sm">
                  · {selectedCourseObj?.course_code || selectedCourseObj?.title}
                </span>
              </h2>

              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative sm:w-56">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students…"
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Export CSV button */}
                {filteredStudents.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={handleExportCSV}
                  >
                    <Download size={14} />
                    Export CSV
                  </Button>
                )}
              </div>
            </div>

            {loadingStudents ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-primary" size={40} />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Users size={48} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">
                  {searchTerm ? "No students match your search" : "No students enrolled"}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border/60 overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-secondary/30 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <div className="col-span-4">Student</div>
                  <div className="col-span-2">Matric No.</div>
                  <div className="col-span-2">Department</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2 text-right">Score</div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-border/40">
                  {filteredStudents.map((s, i) => {
                    const cfg = getStatusConfig(s.attempt_status);
                    const StatusIcon = cfg.icon;
                    return (
                      <motion.div
                        key={s.student_id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                        className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center hover:bg-muted/20 transition-colors text-sm"
                      >
                        {/* Student name */}
                        <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                            {(s.student_name || s.student_username || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {s.student_name || s.student_username}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {s.student_username}
                            </p>
                          </div>
                        </div>

                        {/* Matric */}
                        <div className="col-span-2 text-muted-foreground text-xs">
                          {s.matric_number || <span className="italic opacity-50">—</span>}
                        </div>

                        {/* Dept */}
                        <div className="col-span-2 text-muted-foreground text-xs">
                          {s.department || <span className="italic opacity-50">—</span>}
                        </div>

                        {/* Status */}
                        <div className="col-span-2">
                          {s.has_attempted ? (
                            <Badge
                              variant="outline"
                              className={`text-xs flex items-center gap-1 w-fit ${cfg.className}`}
                            >
                              <StatusIcon size={10} />
                              {cfg.label}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground w-fit">
                              Not attempted
                            </Badge>
                          )}
                        </div>

                        {/* Score */}
                        <div className="col-span-2 text-right">
                          {s.has_attempted ? (
                            <ScorePill
                              score={s.score}
                              total={selectedTestObj?.total_marks}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground italic">—</span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state when nothing selected */}
        {!selectedTest && !loadingCourses && (
          <div className="text-center py-24 text-muted-foreground">
            <BookOpen size={52} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">
              {!selectedCourse
                ? "Select a course to get started"
                : tests.length === 0
                ? "No tests have been created for this course yet"
                : "Select a test to view student results"}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminTests;