import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Search,
  Loader2,
  RefreshCw,
  User,
  GraduationCap,
  BookOpen,
  Calendar,
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

const AdminWarnings = () => {
  const [warnings, setWarnings] = useState([]);
  const [students, setStudents] = useState([]);
  const [adminName, setAdminName] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStudent, setFilterStudent] = useState("all");

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

  // Fetch all students so we can iterate their warnings
  const fetchAllWarnings = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get all users (students)
      const usersRes = await fetch(`${BASE_URL}/admin/users?role=student&limit=200`, {
        headers: authHeader(),
      });
      const allStudents = usersRes.ok ? await usersRes.json() : [];
      setStudents(allStudents);

      // 2. Get teachers for name lookup
      const teachersRes = await fetch(`${BASE_URL}/admin/users?role=teacher&limit=200`, {
        headers: authHeader(),
      });
      const allTeachers = teachersRes.ok ? await teachersRes.json() : [];
      const teacherMap = {};
      allTeachers.forEach((t) => (teacherMap[t.id] = t));

      // 3. Fetch warnings per student and flatten
      const studentMap = {};
      allStudents.forEach((s) => (studentMap[s.id] = s));

      const allWarnings = [];
      await Promise.all(
        allStudents.map(async (student) => {
          try {
            const wRes = await fetch(`${BASE_URL}/warnings/all`, {
              headers: authHeader(),
            });
            if (wRes.ok) {
              const wData = await wRes.json();
              wData.forEach((w) => {
                allWarnings.push({
                  ...w,
                  student_name: student.full_name || student.username,
                  student_email: student.email,
                  teacher: teacherMap[w.issued_by] || null,
                });
              });
            }
          } catch (_) {}
        })
      );

      // Sort newest first
      allWarnings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setWarnings(allWarnings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminProfile();
    fetchAllWarnings();
  }, [fetchAllWarnings]);

  const filtered = warnings.filter((w) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      w.student_name?.toLowerCase().includes(term) ||
      w.reason?.toLowerCase().includes(term) ||
      w.course_code?.toLowerCase().includes(term) ||
      w.teacher?.full_name?.toLowerCase().includes(term) ||
      w.teacher?.username?.toLowerCase().includes(term);

    const matchesStudent =
      filterStudent === "all" || w.student_id === filterStudent;

    return matchesSearch && matchesStudent;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <DashboardLayout role="admin" userName={adminName}>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Warnings Overview</h1>
            <p className="text-muted-foreground mt-1">
              All warnings issued by teachers across the platform
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search warnings..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select value={filterStudent} onValueChange={setFilterStudent}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by student" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name || s.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={fetchAllWarnings} title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Summary badge */}
        {!loading && (
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
            of <span className="font-semibold text-foreground">{warnings.length}</span> total warnings
          </p>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-primary" size={48} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <AlertTriangle size={52} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">
              {searchTerm || filterStudent !== "all"
                ? "No warnings match your filters"
                : "No warnings issued yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((w, index) => (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
                className="p-5 rounded-xl bg-card border border-border/60 hover:border-yellow-500/40 hover:shadow-sm transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Warning icon */}
                  <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="text-yellow-500" size={18} />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Reason */}
                    <p className="text-sm font-medium text-foreground leading-snug">{w.reason}</p>

                    {/* Meta row */}
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                      {/* Student */}
                      <span className="flex items-center gap-1">
                        <GraduationCap size={12} />
                        <span className="font-medium text-foreground">{w.student_name}</span>
                        {w.student_email && (
                          <span className="text-muted-foreground">· {w.student_email}</span>
                        )}
                      </span>

                      {/* Teacher */}
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        Issued by{" "}
                        <span className="font-medium text-foreground">
                          {w.teacher
                            ? w.teacher.full_name || w.teacher.username
                            : "Unknown Teacher"}
                        </span>
                      </span>

                      {/* Course */}
                      {w.course_code && (
                        <span className="flex items-center gap-1">
                          <BookOpen size={12} />
                          <span className="font-medium text-foreground">{w.course_code}</span>
                          {w.course_name && (
                            <span className="text-muted-foreground">· {w.course_name}</span>
                          )}
                        </span>
                      )}

                      {/* Date */}
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(w.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Read badge */}
                  <Badge
                    variant="outline"
                    className={
                      w.is_read
                        ? "text-muted-foreground border-border"
                        : "text-yellow-600 border-yellow-500/40 bg-yellow-500/5"
                    }
                  >
                    {w.is_read ? "Read" : "Unread"}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminWarnings;