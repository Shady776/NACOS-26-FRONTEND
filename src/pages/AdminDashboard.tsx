import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  BookOpen,
  TrendingUp,
  UserPlus,
  AlertCircle,
  X,
  Save,
  Loader2,
  ClipboardList,
  GraduationCap,
  Eye,
  EyeOff,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BASE_URL } from "@/components/api/api";

const DEPARTMENTS = [
  { value: "CSC", label: "Computer Science (CSC)" },
  { value: "SEN", label: "Software Engineering (SEN)" },
  { value: "IFT", label: "Information Technology (IFT)" },
  { value: "CYB", label: "Cybersecurity (CYB)" },
];

/* ── Reusable password input ──────────────────────────────────────────────── */
const PasswordInput = ({ value, onChange, placeholder = "Min. 6 characters" }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        className="w-full px-4 py-2.5 pr-11 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
};

const AdminDashboard = () => {
  const { toast } = useToast();

  const [overview, setOverview] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState("");
  const [modalType, setModalType] = useState(null); // 'user' | 'course'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [userForm, setUserForm] = useState({
    username: "",
    email: "",
    full_name: "",
    password: "",
    department: "",
    role: "teacher",
  });

  const [courseForm, setCourseForm] = useState({
    course_code: "",
    title: "",
    department: "",
    semester: "",
    description: "",
    location: "",
    schedule: "",
    credits: 3,
    teacher_id: "",
  });

  const token = () => localStorage.getItem("access_token");
  const authHeader = () => ({ Authorization: `Bearer ${token()}` });

  const fetchAdminProfile = async () => {
    try {
      const res = await fetch(`${BASE_URL}/users/me`, { headers: authHeader() });
      if (res.ok) {
        const data = await res.json();
        setAdminName(data.full_name || data.username);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOverview = async () => {
    try {
      const res = await fetch(`${BASE_URL}/admin/statistics/overview`, {
        headers: authHeader(),
      });
      if (res.ok) setOverview(await res.json());
    } catch (err) {
      console.error(err);
    }
  };



  const fetchRecentActivity = async () => {
    try {
      const res = await fetch(`${BASE_URL}/admin/statistics/recent-activity?days=7&limit=6`, {
        headers: authHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setRecentActivity(data.activities || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/admin/users?role=teacher&limit=100`, {
        headers: authHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setTeachers(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchAdminProfile(), fetchOverview(), fetchRecentActivity(), fetchTeachers()]);
    setLoading(false);
  }, [fetchTeachers]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /* ── Modal helpers ─────────────────────────────────────────────────────── */
  const openModal = (type) => {
    setModalType(type);
    setError("");
    if (type === "user") {
      setUserForm({
        username: "",
        email: "",
        full_name: "",
        password: "",
        department: "",
        role: "teacher",
      });
    } else {
      setCourseForm({
        course_code: "",
        title: "",
        department: "",
        semester: "",
        description: "",
        location: "",
        schedule: "",
        credits: 3,
        teacher_id: "",
      });
    }
  };

  const closeModal = () => {
    setModalType(null);
    setError("");
  };

  /* ── Create teacher ────────────────────────────────────────────────────── */
  const handleCreateTeacher = async () => {
    if (!userForm.username || !userForm.email || !userForm.password) {
      setError("Please fill in all required fields");
      return;
    }
    if (userForm.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/admin/users/teacher`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(userForm),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail || "Failed to create teacher");
      }
      toast({ title: "Teacher created", description: "New teacher account is ready." });
      await fetchTeachers();
      closeModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Create course ─────────────────────────────────────────────────────── */
  const handleCreateCourse = async () => {
    const teacherId = String(courseForm.teacher_id || "").trim();

    if (
      !courseForm.course_code ||
      !courseForm.title ||
      !courseForm.department ||
      !courseForm.semester ||
      !teacherId
    ) {
      setError("Please fill in all required fields including the teacher");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const { teacher_id, ...bodyPayload } = courseForm;

      const res = await fetch(
        `${BASE_URL}/admin/courses?teacher_id=${encodeURIComponent(teacherId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify(bodyPayload),
        }
      );

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail || "Failed to create course");
      }

      toast({ title: "Course created", description: "The course has been set up." });
      closeModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Activity helpers ──────────────────────────────────────────────────── */
  const activityIcon = (type) => {
    const map = {
      user: <Users size={14} className="text-primary" />,
      course: <BookOpen size={14} className="text-blue-500" />,
      assignment: <ClipboardList size={14} className="text-yellow-500" />,
      submission: <GraduationCap size={14} className="text-purple-500" />,
      enrollment: <UserPlus size={14} className="text-green-500" />,
    };
    return map[type] || <AlertCircle size={14} />;
  };

const formatTimeAgo = (dateStr) => {
  const iso = dateStr.endsWith("Z") || dateStr.includes("+") ? dateStr : dateStr + "Z";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

  /* ── Derived stats ─────────────────────────────────────────────────────── */
  const stats = overview
    ? [
        { title: "Total Students", value: overview.users?.students ?? 0, icon: Users, delay: 0.1, variant: "glow" },
        { title: "Total Teachers", value: overview.users?.teachers ?? 0, icon: GraduationCap, delay: 0.2 },
        { title: "Active Courses", value: overview.courses?.active ?? 0, icon: BookOpen, delay: 0.3 },
        { title: "Total Submissions", value: overview.submissions?.total ?? 0, icon: ClipboardList, delay: 0.4 },
      ]
    : [];

  if (loading) {
    return (
      <DashboardLayout role="admin" userName={adminName}>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="animate-spin text-primary" size={48} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin" userName={adminName}>
      <div className="space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold mb-1">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage the entire platform.</p>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <StatCard
              key={s.title}
              title={s.title}
              value={s.value}
              icon={s.icon}
              delay={s.delay}
              variant={s.variant as "default" | "glow"}
            />
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="grid sm:grid-cols-2 gap-4"
        >
          {[
            {
              icon: UserPlus,
              label: "Add Teacher",
              description: "Create a new teacher account",
              action: () => openModal("user"),
            },
            {
              icon: BookOpen,
              label: "New Course",
              description: "Set up a course and assign it to a teacher",
              action: () => openModal("course"),
            },
          ].map((action, i) => (
            <div
              key={i}
              onClick={action.action}
              className="p-5 rounded-xl bg-card border border-border/50 hover:border-primary/50 hover:shadow-[0_0_40px_hsl(142_76%_45%_/_0.1)] transition-all duration-300 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-all duration-300">
                <action.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{action.label}</h3>
              <p className="text-sm text-muted-foreground">{action.description}</p>
            </div>
          ))}
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="p-6 rounded-xl bg-card border border-border/50"
        >
          <h2 className="text-xl font-display font-semibold flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5 text-primary" />
            Recent Activity
          </h2>
          {recentActivity.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <TrendingUp size={40} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/30 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    {activityIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      <span className="font-medium">{item.user_name || "Someone"}</span>{" "}
                      {item.action}{" "}
                      <span className="text-muted-foreground">{item.title}</span>
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {formatTimeAgo(item.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Add Teacher Modal ──────────────────────────────────────────────── */}
      {modalType === "user" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto border border-border"
          >
            <div className="sticky top-0 bg-card p-6 border-b border-border flex justify-between items-center rounded-t-3xl z-10">
              <div>
                <h3 className="text-2xl font-bold text-foreground">Create Teacher Account</h3>
                <p className="text-sm text-muted-foreground mt-1">Add a new teacher to the platform</p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-secondary rounded-full text-muted-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle className="text-destructive flex-shrink-0" size={18} />
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">
                    Username <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="e.g. dr_johnson"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Full Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="e.g. Dr. Johnson"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">
                  Email <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="e.g. johnson@university.edu"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">
                  Password <span className="text-destructive">*</span>
                </label>
                <PasswordInput
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Department</label>
                <Select
                  value={userForm.department}
                  onValueChange={(v) => setUserForm({ ...userForm, department: v })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select department..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button variant="outline" onClick={closeModal} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTeacher} disabled={submitting} className="flex items-center gap-2">
                  {submitting
                    ? <><Loader2 className="animate-spin" size={16} /> Creating...</>
                    : <><Save size={16} /> Create Teacher</>
                  }
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Create Course Modal ────────────────────────────────────────────── */}
      {modalType === "course" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto border border-border"
          >
            <div className="sticky top-0 bg-card p-6 border-b border-border flex justify-between items-center rounded-t-3xl z-10">
              <div>
                <h3 className="text-2xl font-bold text-foreground">Create New Course</h3>
                <p className="text-sm text-muted-foreground mt-1">Assign a course to an existing teacher</p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-secondary rounded-full text-muted-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle className="text-destructive flex-shrink-0" size={18} />
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}

              {/* Teacher selector */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">
                  Assign to Teacher <span className="text-destructive">*</span>
                </label>
                <Select
                  value={courseForm.teacher_id}
                  onValueChange={(v) => setCourseForm((prev) => ({ ...prev, teacher_id: String(v) }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select a teacher..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground">No teachers found</div>
                    ) : (
                      teachers.map((t) => (
                        <SelectItem key={String(t.id)} value={String(t.id)}>
                          {t.full_name || t.username}{t.department ? ` (${t.department})` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">
                    Department <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={courseForm.department}
                    onValueChange={(v) => setCourseForm({ ...courseForm, department: v })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select department..." />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">
                    Semester <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={courseForm.semester}
                    onValueChange={(v) => setCourseForm({ ...courseForm, semester: v })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select semester..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1st">1st Semester</SelectItem>
                      <SelectItem value="2nd">2nd Semester</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-foreground mb-2">
                    Course Code <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="e.g. CSC 301"
                    value={courseForm.course_code}
                    onChange={(e) => setCourseForm({ ...courseForm, course_code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    value={courseForm.credits}
                    onChange={(e) => setCourseForm({ ...courseForm, credits: parseInt(e.target.value) || 3 })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">
                  Course Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="e.g. Data Structures and Algorithms"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Description</label>
                <textarea
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all h-24 resize-none"
                  placeholder="Brief course description..."
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Schedule</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="e.g. Mon/Wed 10:00 AM"
                    value={courseForm.schedule}
                    onChange={(e) => setCourseForm({ ...courseForm, schedule: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Location</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="e.g. Room 201"
                    value={courseForm.location}
                    onChange={(e) => setCourseForm({ ...courseForm, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button variant="outline" onClick={closeModal} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCourse} disabled={submitting} className="flex items-center gap-2">
                  {submitting
                    ? <><Loader2 className="animate-spin" size={16} /> Creating...</>
                    : <><Save size={16} /> Create Course</>
                  }
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboard;