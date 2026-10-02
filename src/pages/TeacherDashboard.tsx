import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  CheckCircle2, 
  TrendingUp, 
  BookOpen, 
  Clock, 
  ChevronRight, 
  X,
  Save,
  Loader2,
  AlertCircle,
  Plus
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
import { motion } from "framer-motion";
import { BASE_URL } from "@/components/api/api";

const DEPARTMENTS = [
  { value: 'CSC', label: 'Computer Science (CSC)' },
  { value: 'SEN', label: 'Software Engineering (SEN)' },
  { value: 'IFT', label: 'Information Technology (IFT)' },
  { value: 'CYB', label: 'Cybersecurity (CYB)' }
];

const SEMESTERS = [
  { value: '1st', label: '1st Semester' },
  { value: '2nd', label: '2nd Semester' }
];

const TeacherDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [teacherName, setTeacherName] = useState('');

  const [courseForm, setCourseForm] = useState({
    course_code: '',
    title: '',
    department: '',
    semester: '',
    description: '',
    location: '',
    schedule: '',
    credits: 3
  });

  const [assignmentForm, setAssignmentForm] = useState({
    course_id: '',
    title: '',
    description: '',
    max_score: 100,
    due_date: ''
  });

  useEffect(() => {
    fetchDashboardData();
    fetchTeacherProfile();
  }, []);

  const fetchTeacherProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${BASE_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeacherName(data.full_name || data.username);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchDashboardData = async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem('access_token');
    
    // Fetch dashboard stats (includes recent_submissions)
    const dashboardRes = await fetch(`${BASE_URL}/teacher/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!dashboardRes.ok) throw new Error('Failed to fetch dashboard data');
    
    const data = await dashboardRes.json();
    console.log("Dashboard data:", data);
    setDashboardData(data);
    
    // Fetch courses list with counts already included from assignments endpoint
    const coursesRes = await fetch(`${BASE_URL}/assignments/courses-list`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (coursesRes.ok) {
      const coursesData = await coursesRes.json();
      // coursesData already has enrolled_count and assignments_count
      setCourses(coursesData);
    }
  } catch (err) {
    console.error('Error:', err);
    setError('Failed to load dashboard');
  } finally {
    setLoading(false);
  }
};

  const openModal = (type) => {
    setModalType(type);
    setError('');
    
    if (type === 'course') {
      setCourseForm({
        course_code: '',
        title: '',
        department: '',
        semester: '',
        description: '',
        location: '',
        schedule: '',
        credits: 3
      });
    } else if (type === 'assignment') {
      setAssignmentForm({
        course_id: '',
        title: '',
        description: '',
        max_score: 100,
        due_date: ''
      });
    }
  };

  const closeModal = () => {
    setModalType(null);
    setError('');
  };

  const handleCreateCourse = async () => {
    if (!courseForm.course_code || !courseForm.title || !courseForm.department || !courseForm.semester) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${BASE_URL}/teacher/dashboard/quick-actions/create-course`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(courseForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create course');
      }

      await fetchDashboardData();
      closeModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!assignmentForm.course_id || !assignmentForm.title) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      const submitData = {
        ...assignmentForm,
        due_date: assignmentForm.due_date ? new Date(assignmentForm.due_date).toISOString() : null
      };

      const response = await fetch(`${BASE_URL}/teacher/dashboard/quick-actions/create-assignment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create assignment');
      }

      await fetchDashboardData();
      closeModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    
    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  if (loading) {
    return (
      <DashboardLayout role="teacher" userName={teacherName}>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="animate-spin text-primary" size={48} />
        </div>
      </DashboardLayout>
    );
  }

  const stats = dashboardData?.stats || {
    total_students: 0,
    active_courses: 0,
    active_assignments: 0,
    pending_grading: 0
  };

  const recentSubmissions = dashboardData?.recent_submissions || [];

  // Calculate average completion (mock for now)
  const avgCompletion = stats.active_assignments > 0 
    ? Math.round((stats.pending_grading / stats.active_assignments) * 100) 
    : 0;

  return (
    <DashboardLayout role="teacher" userName={teacherName}>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">Welcome, {teacherName}</h1>
            <p className="text-muted-foreground">Here's an overview of your teaching activities.</p>
          </div>
          <Button variant="glow" size="lg" onClick={() => openModal('assignment')}>
            <Plus className="w-4 h-4 mr-2" />
            New Assignment
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Students"
            value={stats.total_students}
            icon={Users}
            delay={0.1}
            variant="glow"
          />
          <StatCard
            title="Active Courses"
            value={stats.active_courses}
            icon={BookOpen}
            delay={0.2}
          />
          <StatCard
            title="Pending Reviews"
            value={stats.pending_grading}
            icon={FileText}
            delay={0.3}
          />
          <StatCard
            title="Active Assignments"
            value={stats.active_assignments}
            icon={TrendingUp}
            delay={0.4}
          />
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Courses */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="lg:col-span-2 p-6 rounded-xl bg-card border border-border/50"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                My Courses
              </h2>
              <Button variant="ghost" size="sm" className="text-primary" onClick={() => openModal('course')}>
                <Plus className="w-4 h-4 mr-1" />
                Add Course
              </Button>
            </div>
            <div className="space-y-4">
              {courses.length > 0 ? (
                courses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 border border-border/30 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{course.title}</h3>
                        <p className="text-sm text-muted-foreground">{course.course_code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8 text-right">
                      <div>
                        <p className="text-lg font-semibold text-foreground">{course.enrolled_count || 0}</p>
                        <p className="text-xs text-muted-foreground">Students</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">{course.assignments_count || 0}</p>
                        <p className="text-xs text-muted-foreground">Assignments</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No courses yet</p>
                  <p className="text-xs mt-1">Create your first course to get started</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Recent Submissions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="p-6 rounded-xl bg-card border border-border/50"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Recent Submissions
              </h2>
            </div>
            <div className="space-y-4">
              {recentSubmissions.length > 0 ? (
                recentSubmissions.slice(0, 5).map((submission, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                        {submission.student_initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {submission.student_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {submission.file_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-primary">{submission.course_code}</span>
                      <span className="text-muted-foreground">
                        {formatTimeAgo(submission.submitted_at)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock size={40} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent submissions</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Pending Grading Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="p-6 rounded-xl bg-card border border-border/50"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Recent Submissions Needing Review
            </h2>
          </div>
          <div className="space-y-3">
            {recentSubmissions.length > 0 ? (
              recentSubmissions.map((submission, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 border border-border/30 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                      {submission.student_initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground">{submission.assignment_title}</h3>
                      <p className="text-sm text-muted-foreground">
                        by {submission.student_name} • {submission.course_code}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-muted-foreground">
                      {formatTimeAgo(submission.submitted_at)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No pending submissions</p>
                <p className="text-xs mt-1">All caught up!</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Create Course Modal */}
      {modalType === 'course' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto border border-border"
          >
            <div className="sticky top-0 bg-card p-6 border-b border-border flex justify-between items-center rounded-t-3xl z-10">
              <div>
                <h3 className="text-2xl font-bold text-foreground">Create New Course</h3>
                <p className="text-sm text-muted-foreground mt-1">Fill in the course details below</p>
              </div>
              <button 
                onClick={closeModal} 
                className="p-2 hover:bg-secondary rounded-full text-muted-foreground transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="text-destructive flex-shrink-0" size={20} />
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">
                    Department <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={courseForm.department}
                    onValueChange={(value) => setCourseForm({ ...courseForm, department: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Department..." />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(dept => (
                        <SelectItem key={dept.value} value={dept.value}>
                          {dept.label}
                        </SelectItem>
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
                    onValueChange={(value) => setCourseForm({ ...courseForm, semester: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Semester..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SEMESTERS.map(sem => (
                        <SelectItem key={sem.value} value={sem.value}>
                          {sem.label}
                        </SelectItem>
                      ))}
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
                  <label className="block text-sm font-bold text-foreground mb-2">
                    Credits <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    value={courseForm.credits}
                    onChange={(e) => setCourseForm({ ...courseForm, credits: parseInt(e.target.value) })}
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
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all h-32 resize-none"
                  placeholder="Brief course description..."
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                ></textarea>
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

              <div className="pt-4 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCourse}
                  disabled={submitting}
                  className="flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Create Course
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {modalType === 'assignment' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto border border-border"
          >
            <div className="sticky top-0 bg-card p-6 border-b border-border flex justify-between items-center rounded-t-3xl z-10">
              <div>
                <h3 className="text-xl font-bold text-foreground">Create Assignment</h3>
                <p className="text-sm text-muted-foreground mt-1">Add a new assignment for your course</p>
              </div>
              <button 
                onClick={closeModal} 
                className="p-2 hover:bg-secondary rounded-full text-muted-foreground transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="text-destructive flex-shrink-0" size={20} />
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">
                  Select Course <span className="text-destructive">*</span>
                </label>
                <Select
                  value={assignmentForm.course_id}
                  onValueChange={(value) => setAssignmentForm({ ...assignmentForm, course_id: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a course..." />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.course_code} - {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">
                  Assignment Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="e.g. Research Project"
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Due Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    value={assignmentForm.due_date}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, due_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">
                    Max Score <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    value={assignmentForm.max_score}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, max_score: parseFloat(e.target.value) })}
/>
</div>
</div>
<div>
            <label className="block text-sm font-bold text-foreground mb-2">Instructions/Description</label>
            <textarea
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all h-32 resize-none"
              placeholder="Detailed instructions..."
              value={assignmentForm.description}
              onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
            ></textarea>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={closeModal}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAssignment}
              disabled={submitting}
              className="flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Creating...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Create Assignment
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )}
</DashboardLayout>
);
};
export default TeacherDashboard;