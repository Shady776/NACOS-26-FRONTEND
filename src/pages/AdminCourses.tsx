import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { BookOpen, MoreVertical, Trash2, Loader2, RefreshCw, Search, Pencil } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { BASE_URL } from "@/components/api/api";

interface Course {
  id: string;
  title: string;
  course_code: string;
  description?: string;
  department?: string;
  semester?: string;
  credits?: number | string;
  schedule?: string;
  location?: string;
  instructor?: string;
}

interface EditForm {
  title: string;
  course_code: string;
  description: string;
  department: string;
  semester: string;
  credits: string;
  schedule: string;
  location: string;
}

const emptyForm: EditForm = {
  title: '',
  course_code: '',
  description: '',
  department: '',
  semester: '',
  credits: '',
  schedule: '',
  location: '',
};

const editFields: { label: string; key: keyof EditForm }[] = [
  { label: 'Title', key: 'title' },
  { label: 'Course Code', key: 'course_code' },
  { label: 'Department', key: 'department' },
  { label: 'Semester', key: 'semester' },
  { label: 'Credits', key: 'credits' },
  { label: 'Schedule', key: 'schedule' },
  { label: 'Location', key: 'location' },
];

const AdminCourses = () => {
  const { toast } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Course | null>(null);

  // Edit state
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAdminProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${BASE_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminName(data.full_name || data.username);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${BASE_URL}/admin/courses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data: Course[] = await res.json();
        setCourses(data);
      }
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminProfile();
    fetchCourses();
  }, [fetchCourses]);

  const handleDeleteCourse = async (course: Course) => {
    setDeletingId(course.id);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${BASE_URL}/admin/courses/${course.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setCourses(prev => prev.filter(c => c.id !== course.id));
        toast({
          title: "Course deleted",
          description: `"${course.title}" has been removed.`,
        });
      } else {
        toast({
          title: "Delete failed",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Failed to delete course:', err);
      toast({
        title: "Delete failed",
        description: "A network error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const openEdit = (course: Course) => {
    setEditCourse(course);
    setEditForm({
      title: course.title || '',
      course_code: course.course_code || '',
      description: course.description || '',
      department: course.department || '',
      semester: course.semester || '',
      credits: String(course.credits ?? ''),
      schedule: course.schedule || '',
      location: course.location || '',
    });
  };

  const handleEditCourse = async () => {
    if (!editCourse) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');

      // Send credits as a number, and leave it out if the field is empty
      const { credits, ...rest } = editForm;
      const payload = {
        ...rest,
        ...(credits !== '' && { credits: Number(credits) }),
      };

      const res = await fetch(`${BASE_URL}/admin/courses/${editCourse.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated: Course = await res.json();
        setCourses(prev => prev.map(c => c.id === updated.id ? updated : c));
        setEditCourse(null);
        toast({
          title: "Course updated",
          description: `"${updated.title}" has been saved successfully.`,
        });
      } else {
        toast({
          title: "Update failed",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Failed to update course:', err);
      toast({
        title: "Update failed",
        description: "A network error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredCourses = courses.filter(course =>
    course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.course_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.instructor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout role="admin" userName={adminName}>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Course Management</h1>
            <p className="text-muted-foreground mt-1">Oversee all academic courses on the platform</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchCourses} title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-primary" size={48} />
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <BookOpen size={52} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">{searchTerm ? 'No courses match your search' : 'No courses found'}</p>
            <p className="text-sm mt-1">Courses created by teachers will appear here</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.07 }}
              >
                <Card className="h-full flex flex-col hover:shadow-md transition-shadow border-border/60">
                  <CardHeader className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {course.course_code}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(course)}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit Course
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setConfirmDelete(course)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete Course
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardTitle className="line-clamp-2 text-base leading-snug">{course.title}</CardTitle>
                    <CardDescription className="mt-1">{course.instructor || 'Unknown Instructor'}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2">
                      {course.department && (
                        <span className="text-xs px-2 py-1 rounded bg-secondary text-muted-foreground">
                          {course.department}
                        </span>
                      )}
                      {course.semester && (
                        <span className="text-xs px-2 py-1 rounded bg-secondary text-muted-foreground">
                          {course.semester} Sem
                        </span>
                      )}
                      {course.credits && (
                        <span className="text-xs px-2 py-1 rounded bg-secondary text-muted-foreground">
                          {course.credits} credit{Number(course.credits) !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Course Modal */}
      {editCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-3xl w-full max-w-lg shadow-2xl border border-border p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Pencil className="text-primary" size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Edit Course</h3>
                <p className="text-sm text-muted-foreground">Update course details</p>
              </div>
            </div>

            <div className="space-y-3">
              {editFields.map(({ label, key }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-muted-foreground">{label}</label>
                  <Input
                    value={editForm[key]}
                    onChange={(e) => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              ))}

              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditCourse(null)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleEditCourse} disabled={saving} className="flex items-center gap-2">
                {saving
                  ? <><Loader2 className="animate-spin" size={16} />Saving...</>
                  : 'Save Changes'
                }
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-3xl w-full max-w-md shadow-2xl border border-border p-6"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="text-destructive" size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Delete Course</h3>
                <p className="text-sm text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-foreground mb-2">Are you sure you want to delete:</p>
            <div className="bg-secondary/50 rounded-xl p-3 mb-6">
              <p className="font-semibold text-foreground">{confirmDelete.title}</p>
              <p className="text-xs text-muted-foreground">{confirmDelete.course_code} · {confirmDelete.instructor}</p>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={!!deletingId}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteCourse(confirmDelete)}
                disabled={!!deletingId}
                className="flex items-center gap-2"
              >
                {deletingId === confirmDelete.id
                  ? <><Loader2 className="animate-spin" size={16} />Deleting...</>
                  : <><Trash2 size={16} />Delete Course</>
                }
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      <Toaster />
    </DashboardLayout>
  );
};

export default AdminCourses;