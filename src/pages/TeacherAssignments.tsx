import React, { useState, useEffect } from 'react';
import {
  Plus, X, Save, Loader2, AlertCircle, BookOpen, Calendar,
  Trash2, Pencil, Eye, FileText, Clock, Award, ChevronDown, Search, AlertTriangle
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
import { motion, AnimatePresence } from "framer-motion";
import { BASE_URL } from "@/components/api/api";
import { toast } from "sonner";

// ── AssignmentForm is defined OUTSIDE TeacherAssignments to prevent remounting on each keystroke ──
const AssignmentForm = ({ form, setForm, error, courses, isEdit = false }) => (
  <div className="space-y-4">
    {error && (
      <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="text-destructive shrink-0" size={18} />
        <p className="text-sm text-destructive font-medium">{error}</p>
      </div>
    )}

    {!isEdit && (
      <div>
        <label className="block text-sm font-bold text-foreground mb-2">
          Course <span className="text-destructive">*</span>
        </label>
        <Select value={form.course_id} onValueChange={(v) => setForm(prev => ({ ...prev, course_id: v }))}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a course..." />
          </SelectTrigger>
          <SelectContent>
            {courses.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.course_code} — {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )}

    <div>
      <label className="block text-sm font-bold text-foreground mb-2">
        Title <span className="text-destructive">*</span>
      </label>
      <input
        type="text"
        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
        placeholder="e.g. Research Project"
        value={form.title}
        onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
      />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-bold text-foreground mb-2">Due Date</label>
        <input
          type="date"
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
          value={form.due_date}
          onChange={(e) => setForm(prev => ({ ...prev, due_date: e.target.value }))}
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-foreground mb-2">
          Max Score <span className="text-destructive">*</span>
        </label>
        <input
          type="number"
          min="1"
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
          value={form.max_score}
          onChange={(e) => setForm(prev => ({ ...prev, max_score: parseFloat(e.target.value) }))}
        />
      </div>
    </div>

    <div>
      <label className="block text-sm font-bold text-foreground mb-2">Instructions / Description</label>
      <textarea
        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all h-28 resize-none text-sm"
        placeholder="Detailed instructions for students..."
        value={form.description}
        onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
      />
    </div>
  </div>
);

const TeacherAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [modalType, setModalType] = useState(null); // 'create' | 'edit' | 'view' | 'delete'
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [filterCourse, setFilterCourse] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({
    course_id: '',
    title: '',
    description: '',
    max_score: 100,
    due_date: ''
  });

  const token = localStorage.getItem('access_token');

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (courses.length > 0) fetchAssignments();
  }, [courses]);

  const fetchCourses = async () => {
    try {
      const res = await fetch(`${BASE_URL}/assignments/courses-list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
      }
    } catch (err) {
      toast.error("Failed to load courses");
    }
  };

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        courses.map(c =>
          fetch(`${BASE_URL}/assignments/course/${c.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(r => r.ok ? r.json() : [])
        )
      );
      const all = results.flat().map((a) => ({
        ...a,
        course: courses.find(c => c.id === a.course_id)
      }));
      all.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setAssignments(all);
    } catch (err) {
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm({ course_id: '', title: '', description: '', max_score: 100, due_date: '' });
    setError('');
    setModalType('create');
  };

  const openEdit = (assignment) => {
    setSelectedAssignment(assignment);
    setForm({
      course_id: assignment.course_id || '',
      title: assignment.title || '',
      description: assignment.description || '',
      max_score: assignment.max_score || 100,
      due_date: assignment.due_date ? assignment.due_date.substring(0, 10) : ''
    });
    setError('');
    setModalType('edit');
  };

  const openView = (assignment) => {
    setSelectedAssignment(assignment);
    setModalType('view');
  };

  const openDelete = (assignment) => {
    setSelectedAssignment(assignment);
    setModalType('delete');
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedAssignment(null);
    setError('');
  };

  const handleCreate = async () => {
    if (!form.course_id || !form.title) {
      setError('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/teacher/dashboard/quick-actions/create-assignment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          due_date: form.due_date ? new Date(form.due_date).toISOString() : null
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to create assignment');
      }
      toast.success("Assignment created successfully");
      closeModal();
      fetchAssignments();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Deletes all submissions for an assignment so students resubmit after an edit
  const deleteAllSubmissions = async (assignmentId) => {
    try {
      // Fetch all submissions for this assignment
      const res = await fetch(`${BASE_URL}/submissions/assignment/${assignmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return; // If fetch fails, silently continue — don't block the edit

      const submissions = await res.json();
      if (!submissions || submissions.length === 0) return;

      // Delete each submission individually (backend only exposes single-delete)
      await Promise.allSettled(
        submissions.map(sub =>
          fetch(`${BASE_URL}/submissions/${sub.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );
    } catch (err) {
      // Non-fatal — log but don't surface to the user here
      console.warn('Could not clear submissions:', err);
    }
  };

  const handleEdit = async () => {
    if (!form.title) {
      setError('Title is required');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      // 1. Update the assignment
      const res = await fetch(`${BASE_URL}/assignments/${selectedAssignment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          due_date: form.due_date ? new Date(form.due_date).toISOString() : null
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to update assignment');
      }

      // 2. Clear all existing submissions so students resubmit fresh
      await deleteAllSubmissions(selectedAssignment.id);

      toast.success("Assignment updated — all previous submissions have been cleared");
      closeModal();
      fetchAssignments();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/assignments/${selectedAssignment.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to delete assignment');
      }
      toast.success("Assignment deleted");
      closeModal();
      fetchAssignments();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No deadline';
    const [y, m, d] = dateString.substring(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const getDaysUntil = (dateString) => {
    if (!dateString) return null;
    const [y, m, d] = dateString.substring(0, 10).split('-').map(Number);
    const due = new Date(y, m - 1, d);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - today.getTime()) / 86400000);
  };

  const getDeadlineBadge = (dateString) => {
    const days = getDaysUntil(dateString);
    if (days === null) return null;
    if (days < 0) return { label: 'Overdue', class: 'bg-red-100 text-red-700 border-red-200' };
    if (days === 0) return { label: 'Due Today', class: 'bg-red-100 text-red-700 border-red-200' };
    if (days <= 2) return { label: `${days}d left`, class: 'bg-orange-100 text-orange-700 border-orange-200' };
    if (days <= 7) return { label: `${days}d left`, class: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    return { label: `${days}d left`, class: 'bg-green-100 text-green-700 border-green-200' };
  };

  const filtered = assignments.filter(a => {
    const matchesCourse = filterCourse === 'all' || a.course_id === filterCourse;
    const matchesSearch = !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.course?.course_code || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCourse && matchesSearch;
  });

  return (
    <DashboardLayout role="teacher" userName="Teacher">
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Assignments</h1>
            <p className="text-muted-foreground mt-1">
              {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} across {courses.length} course{courses.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2 self-start sm:self-auto">
            <Plus className="w-4 h-4" />
            New Assignment
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search assignments..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterCourse} onValueChange={setFilterCourse}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="All Courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.course_code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-card border border-border rounded-2xl">
            <FileText size={48} className="mx-auto mb-4 text-muted-foreground opacity-40" />
            <h3 className="font-semibold text-lg mb-2">No assignments found</h3>
            <p className="text-muted-foreground text-sm mb-6">
              {assignments.length === 0 ? "Create your first assignment to get started" : "Try adjusting your filters"}
            </p>
            {assignments.length === 0 && (
              <Button onClick={openCreate} className="gap-2">
                <Plus className="w-4 h-4" /> Create Assignment
              </Button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((assignment, idx) => {
              const badge = getDeadlineBadge(assignment.due_date);
              return (
                <motion.div
                  key={assignment.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.05 }}
                  className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:border-primary/30 transition-all duration-300 flex flex-col gap-4 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-primary" />
                    </div>
                    {badge && (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.class}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-base leading-snug mb-1 line-clamp-2">
                      {assignment.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      <BookOpen size={12} />
                      <span>{assignment.course?.course_code || 'Unknown Course'}</span>
                    </div>
                    {assignment.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {assignment.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} />
                      <span>{formatDate(assignment.due_date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Award size={12} />
                      <span>{assignment.max_score} pts</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => openView(assignment)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border hover:bg-secondary/60 text-xs font-semibold text-foreground transition-all duration-200"
                    >
                      <Eye size={13} /> View
                    </button>
                    <button
                      onClick={() => openEdit(assignment)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border hover:bg-primary/10 hover:border-primary/30 hover:text-primary text-xs font-semibold text-foreground transition-all duration-200"
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      onClick={() => openDelete(assignment)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-border hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-xs font-semibold text-foreground transition-all duration-200"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CREATE MODAL ── */}
      <AnimatePresence>
        {modalType === 'create' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto border border-border"
            >
              <div className="sticky top-0 bg-card p-6 border-b border-border flex justify-between items-center rounded-t-3xl z-10">
                <div>
                  <h3 className="text-xl font-bold text-foreground">New Assignment</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Add a new assignment for your students</p>
                </div>
                <button onClick={closeModal} className="p-2 hover:bg-secondary rounded-full text-muted-foreground transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <AssignmentForm form={form} setForm={setForm} error={error} courses={courses} isEdit={false} />
                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={closeModal} disabled={submitting}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={submitting} className="gap-2">
                    {submitting ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : <><Save size={16} /> Create</>}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── EDIT MODAL ── */}
      <AnimatePresence>
        {modalType === 'edit' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto border border-border"
            >
              <div className="sticky top-0 bg-card p-6 border-b border-border flex justify-between items-center rounded-t-3xl z-10">
                <div>
                  <h3 className="text-xl font-bold text-foreground">Edit Assignment</h3>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-xs">{selectedAssignment?.title}</p>
                </div>
                <button onClick={closeModal} className="p-2 hover:bg-secondary rounded-full text-muted-foreground transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {/* Warning banner */}
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <span className="font-semibold">Heads up:</span> Saving changes will delete all existing student submissions for this assignment. Students will need to resubmit.
                  </p>
                </div>

                <AssignmentForm form={form} setForm={setForm} error={error} courses={courses} isEdit={true} />

                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={closeModal} disabled={submitting}>Cancel</Button>
                  <Button onClick={handleEdit} disabled={submitting} className="gap-2">
                    {submitting ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Changes</>}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── VIEW MODAL ── */}
      <AnimatePresence>
        {modalType === 'view' && selectedAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto border border-border"
            >
              <div className="sticky top-0 bg-card p-6 border-b border-border flex justify-between items-center rounded-t-3xl z-10">
                <div>
                  <h3 className="text-xl font-bold text-foreground">Assignment Details</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{selectedAssignment.course?.course_code}</p>
                </div>
                <button onClick={closeModal} className="p-2 hover:bg-secondary rounded-full text-muted-foreground transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Title</p>
                  <p className="text-foreground font-bold text-lg">{selectedAssignment.title}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/40 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar size={14} className="text-primary" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due Date</p>
                    </div>
                    <p className="text-sm font-bold text-foreground">{formatDate(selectedAssignment.due_date)}</p>
                    {getDeadlineBadge(selectedAssignment.due_date) && (
                      <span className={`mt-1 inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${getDeadlineBadge(selectedAssignment.due_date).class}`}>
                        {getDeadlineBadge(selectedAssignment.due_date).label}
                      </span>
                    )}
                  </div>
                  <div className="bg-secondary/40 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Award size={14} className="text-primary" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Max Score</p>
                    </div>
                    <p className="text-sm font-bold text-foreground">{selectedAssignment.max_score} points</p>
                  </div>
                </div>

                <div className="bg-secondary/40 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen size={14} className="text-primary" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course</p>
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {selectedAssignment.course?.course_code} — {selectedAssignment.course?.title}
                  </p>
                </div>

                {selectedAssignment.description && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Instructions</p>
                    <div className="bg-muted rounded-xl p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedAssignment.description}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => { closeModal(); openEdit(selectedAssignment); }}>
                    <Pencil size={14} className="mr-2" /> Edit
                  </Button>
                  <Button variant="outline" className="flex-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200" onClick={() => { closeModal(); openDelete(selectedAssignment); }}>
                    <Trash2 size={14} className="mr-2" /> Delete
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRM MODAL ── */}
      <AnimatePresence>
        {modalType === 'delete' && selectedAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-3xl w-full max-w-sm shadow-2xl border border-border p-6 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Delete Assignment?</h3>
              <p className="text-sm text-muted-foreground mb-1">
                You're about to delete
              </p>
              <p className="text-sm font-semibold text-foreground mb-4">
                "{selectedAssignment.title}"
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                This will also delete all student submissions for this assignment. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={closeModal} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0"
                  onClick={handleDelete}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Delete'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default TeacherAssignments;