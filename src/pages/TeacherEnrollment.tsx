import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  BookOpen,
  Loader2,
  Search,
  ChevronDown,
  GraduationCap,
  Mail,
  Hash,
  Building2,
  MoreHorizontal,
  MessageSquare,
  UserX,
  ClipboardList,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  X,
  Send,
  AlertTriangle,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BASE_URL } from "@/components/api/api";

/* ─────────────────────────── Types ─────────────────────────── */

interface Course {
  id: string;
  title: string;
  course_code: string;
  department: string;
  semester: string;
  credits: number;
  enrolled_count?: number;
  assignments_count?: number;
}

interface Student {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: string;
  matric_number?: string;
  department?: string;
  created_at: string;
}

interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  student: Student;
  course: {
    id: string;
    title: string;
    course_code: string;
    department: string;
    semester: string;
    credits: number;
  };
}

/* ─────────────────────────── Helpers ─────────────────────────── */

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const AVATAR_COLORS = [
  "bg-violet-500/20 text-violet-400",
  "bg-blue-500/20 text-blue-400",
  "bg-emerald-500/20 text-emerald-400",
  "bg-amber-500/20 text-amber-400",
  "bg-rose-500/20 text-rose-400",
  "bg-cyan-500/20 text-cyan-400",
];

const avatarColor = (id: string) =>
  AVATAR_COLORS[parseInt(id.slice(-1), 16) % AVATAR_COLORS.length];

/* ─────────────────────────── Component ─────────────────────────── */

const TeacherEnrollments = () => {
  const [teacherName, setTeacherName] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [filteredEnrollments, setFilteredEnrollments] = useState<Enrollment[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Modal states
  const [removeModal, setRemoveModal] = useState<{ open: boolean; enrollment: Enrollment | null }>({ open: false, enrollment: null });
  const [gradesModal, setGradesModal] = useState<{ open: boolean; student: Student | null }>({ open: false, student: null });
  const [warnModal, setWarnModal] = useState<{ open: boolean; student: Student | null }>({ open: false, student: null });

  const [messageText, setMessageText] = useState("");
  const [warnText, setWarnText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* ── Fetch teacher profile ── */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTeacherName(data.full_name || data.username);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchProfile();
  }, []);



  /* ── Fetch courses ── */
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${BASE_URL}/assignments/courses-list`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch courses");
        const data = await res.json();
        setCourses(data);
      } catch (e) {
        toast.error("Failed to load courses");
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  /* ── Fetch enrollments when course changes ── */
  useEffect(() => {
    if (!selectedCourseId) {
      setEnrollments([]);
      setFilteredEnrollments([]);
      return;
    }
    const course = courses.find((c) => c.id === selectedCourseId) || null;
    setSelectedCourse(course);
    fetchEnrollments(selectedCourseId);
  }, [selectedCourseId]);

  /* ── Search filter ── */
  useEffect(() => {
    const q = searchQuery.toLowerCase();
    setFilteredEnrollments(
      enrollments.filter(
        (e) =>
          e.student.full_name.toLowerCase().includes(q) ||
          e.student.email.toLowerCase().includes(q) ||
          (e.student.matric_number || "").toLowerCase().includes(q) ||
          (e.student.department || "").toLowerCase().includes(q)
      )
    );
  }, [searchQuery, enrollments]);

  const fetchEnrollments = async (courseId: string) => {
    try {
      setLoadingEnrollments(true);
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${BASE_URL}/enrollments/course/${courseId}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch enrollments");
      const data: Enrollment[] = await res.json();
      setEnrollments(data);
      setFilteredEnrollments(data);
      setSearchQuery("");
    } catch (e) {
      toast.error("Failed to load students");
    } finally {
      setLoadingEnrollments(false);
    }
  };


  const fetchStudentSubmissions = async (studentId: string, courseId: string) => {
  setLoadingSubmissions(true);
  try {
    const token = localStorage.getItem("access_token");
    const res = await fetch(
      `${BASE_URL}/submissions/student/${studentId}/course/${courseId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error("Failed to fetch submissions");
    const data = await res.json();
    setSubmissions(data);
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    setLoadingSubmissions(false);
  }
};

  /* ── Actions ── */

  const handleRemoveStudent = async () => {
    if (!removeModal.enrollment) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${BASE_URL}/enrollments/teacher/remove/${removeModal.enrollment.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to remove student");
      toast.success(`${removeModal.enrollment.student.full_name} removed from course`);
      setEnrollments((prev) =>
        prev.filter((e) => e.id !== removeModal.enrollment!.id)
      );
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
      setRemoveModal({ open: false, enrollment: null });
    }
  };

const handleSendWarning = async () => {
  if (!warnText.trim() || !warnModal.student) return;
  setSubmitting(true);
  try {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`${BASE_URL}/warnings/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        student_id: warnModal.student.id,
        reason: warnText,
        course_id: selectedCourseId,
      }),
    });
    if (!res.ok) throw new Error("Failed to issue warning");
    toast.success(`Warning issued to ${warnModal.student.full_name}`);
    setWarnModal({ open: false, student: null });
    setWarnText("");
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    setSubmitting(false);
  }
};

  /* ──────────────────────────── Render ──────────────────────────── */

  return (
    <DashboardLayout role="teacher" userName={teacherName}>
      <div className="space-y-8 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Enrollments</h1>
            <p className="text-muted-foreground mt-1">
              View and manage students enrolled in your courses
            </p>
          </div>
          {selectedCourse && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20"
            >
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                {enrollments.length} enrolled
              </span>
            </motion.div>
          )}
        </div>

        {/* ── Course Selector ── */}
        <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Select a Course</p>
              <p className="text-xs text-muted-foreground">
                Choose from your active courses to view enrolled students
              </p>
            </div>
          </div>

          {loadingCourses ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading your courses…
            </div>
          ) : courses.length === 0 ? (
            <div className="text-sm text-muted-foreground py-2">
              You have no courses yet. Create one from the Courses page.
            </div>
          ) : (
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger className="w-full sm:max-w-sm h-11 rounded-xl">
                <SelectValue placeholder="Pick a course…" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="font-medium">{c.course_code}</span>
                    <span className="text-muted-foreground ml-2">— {c.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* ── Enrollments Table Area ── */}
        <AnimatePresence mode="wait">
          {!selectedCourseId ? (
            /* Empty state before selection */
            <motion.div
              key="empty-select"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground"
            >
              <div className="w-20 h-20 rounded-3xl bg-secondary/60 flex items-center justify-center mb-4">
                <GraduationCap size={36} className="opacity-40" />
              </div>
              <p className="text-base font-medium">No course selected</p>
              <p className="text-sm mt-1 opacity-70">
                Select a course above to view its enrolled students
              </p>
            </motion.div>
          ) : loadingEnrollments ? (
            /* Loading skeleton */
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-secondary/30 animate-pulse"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
              ))}
            </motion.div>
          ) : (
            /* Students table */
            <motion.div
              key={selectedCourseId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="space-y-4"
            >
              {/* Course info bar + search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-xs font-mono px-3 py-1">
                    {selectedCourse?.course_code}
                  </Badge>
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    {selectedCourse?.title}
                  </span>
                  <span className="text-xs text-muted-foreground border border-border/40 px-2 py-0.5 rounded-full">
                    {selectedCourse?.semester} • {selectedCourse?.department}
                  </span>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    className="pl-9 h-9 rounded-xl text-sm"
                    placeholder="Search students…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Table */}
              {filteredEnrollments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Users size={40} className="opacity-30 mb-3" />
                  <p className="text-sm font-medium">
                    {searchQuery
                      ? "No students match your search"
                      : "No students enrolled yet"}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/50 overflow-hidden bg-card">
                  {/* Table header */}
                  <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-5 py-3 bg-secondary/30 border-b border-border/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="w-10" />
                    <div>Student</div>
                    <div className="hidden md:block">Department</div>
                    <div className="hidden sm:block">Enrolled</div>
                    <div>Actions</div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-border/30">
                    {filteredEnrollments.map((enrollment, i) => {
                      const s = enrollment.student;
                      return (
                        <motion.div
                          key={enrollment.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.25, delay: i * 0.04 }}
                          className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-5 py-4 items-center hover:bg-secondary/20 transition-colors group"
                        >
                          {/* Avatar */}
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${avatarColor(s.id)}`}
                          >
                            {getInitials(s.full_name)}
                          </div>

                          {/* Name + email */}
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">
                              {s.full_name}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                <Mail className="w-3 h-3 shrink-0" />
                                {s.email}
                              </span>
                              {s.matric_number && (
                                <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1 shrink-0">
                                  <Hash className="w-3 h-3" />
                                  {s.matric_number}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Department */}
                          <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Building2 className="w-4 h-4 shrink-0" />
                            <span className="truncate">{s.department || "—"}</span>
                          </div>

                          {/* Enrolled date */}
                          <div className="hidden sm:block text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(enrollment.enrolled_at)}
                          </div>

                          {/* Actions dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={() => {
                                    setGradesModal({ open: true, student: s });
                                    fetchStudentSubmissions(s.id, selectedCourseId);
                                    }}
                              >
                                <ClipboardList className="w-4 h-4 text-primary" />
                                View Submissions
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={() =>
                                  setWarnModal({ open: true, student: s })
                                }
                              >
                                <ShieldAlert className="w-4 h-4 text-amber-400" />
                                Issue Warning
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                                onClick={() =>
                                  setRemoveModal({ open: true, enrollment })
                                }
                              >
                                <UserX className="w-4 h-4" />
                                Remove from Course
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Footer count */}
                  <div className="px-5 py-3 border-t border-border/40 bg-secondary/10 text-xs text-muted-foreground">
                    Showing {filteredEnrollments.length} of {enrollments.length} student
                    {enrollments.length !== 1 ? "s" : ""}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══════════════════ MODALS ═══════════════════ */}
      {/* Issue Warning */}
      <Dialog
        open={warnModal.open}
        onOpenChange={(o) => {
          if (!o) { setWarnModal({ open: false, student: null }); setWarnText(""); }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              Issue Warning
            </DialogTitle>
            <DialogDescription>
              Issue a formal warning to{" "}
              <span className="font-medium text-foreground">{warnModal.student?.full_name}</span>.
              This will be recorded on their profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-400 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              Warnings are visible to course administrators.
            </div>
            <div className="space-y-1.5">
              <Label>Reason / Details</Label>
              <Textarea
                placeholder="Describe the reason for this warning…"
                rows={4}
                value={warnText}
                onChange={(e) => setWarnText(e.target.value)}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setWarnModal({ open: false, student: null }); setWarnText(""); }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleSendWarning}
              disabled={submitting || !warnText.trim()}
            >
              {submitting ? (
                <><Loader2 className="animate-spin mr-2 w-4 h-4" /> Issuing…</>
              ) : (
                <><ShieldAlert className="w-4 h-4 mr-2" /> Issue Warning</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Submissions (placeholder — wire to real data) */}
      <Dialog
  open={gradesModal.open}
  onOpenChange={(o) => {
    if (!o) { setGradesModal({ open: false, student: null }); setSubmissions([]); }
  }}
>
  <DialogContent className="sm:max-w-2xl">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-primary" />
        Submissions
      </DialogTitle>
      <DialogDescription>
        Assignment submissions for{" "}
        <span className="font-medium text-foreground">{gradesModal.student?.full_name}</span>{" "}
        in <span className="font-medium text-foreground">{selectedCourse?.course_code}</span>
      </DialogDescription>
    </DialogHeader>

    <div className="py-2 max-h-[60vh] overflow-y-auto">
      {loadingSubmissions ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-secondary/30 animate-pulse" />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <ClipboardList size={36} className="opacity-30 mb-3" />
          <p className="text-sm font-medium">No submissions yet</p>
          <p className="text-xs mt-1 opacity-70">This student hasn't submitted any assignments</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="p-4 rounded-xl border border-border/40 bg-secondary/20 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{sub.assignment?.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Submitted {formatDate(sub.submitted_at || sub.created_at)}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                  sub.status === "graded"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : sub.status === "late"
                    ? "bg-rose-500/10 text-rose-400"
                    : "bg-blue-500/10 text-blue-400"
                }`}>
                  {sub.status}
                </span>
              </div>

              {sub.score !== null && sub.score !== undefined && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Score: <span className="font-semibold text-foreground">{sub.score} / {sub.assignment?.max_score}</span>
                </div>
              )}

              {sub.feedback && (
                <p className="text-xs text-muted-foreground border-t border-border/30 pt-2 mt-2">
                  <span className="font-medium text-foreground">Feedback: </span>
                  {sub.feedback}
                </p>
              )}

              {sub.file_url && (
                <a
                  href={sub.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <ClipboardList className="w-3 h-3" />
                  View File
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>

    <DialogFooter>
      <Button onClick={() => { setGradesModal({ open: false, student: null }); setSubmissions([]); }}>
        Close
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
      {/* Remove Student Confirmation */}
      <AlertDialog
        open={removeModal.open}
        onOpenChange={(o) => { if (!o) setRemoveModal({ open: false, enrollment: null }); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-destructive" />
              Remove Student?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will unenroll{" "}
              <span className="font-semibold text-foreground">
                {removeModal.enrollment?.student.full_name}
              </span>{" "}
              from{" "}
              <span className="font-semibold text-foreground">
                {selectedCourse?.course_code}
              </span>
              . They will lose access to all course materials and submissions.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveStudent}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? (
                <><Loader2 className="animate-spin mr-2 w-4 h-4" /> Removing…</>
              ) : (
                "Yes, Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default TeacherEnrollments;