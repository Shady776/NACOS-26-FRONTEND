import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Plus, FileQuestion, Calendar, Clock, MoreVertical, Edit, Trash2, 
  CheckCircle2, Eye, BarChart3, X, Loader2, Save, Power, AlertCircle, Users, Download
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BASE_URL } from "@/components/api/api";

/* ── CSV Export Helper ────────────────────────────────────────────────────── */
const exportToCSV = ({ students, test }) => {
  const totalMarks = test?.total_marks;

  const headers = [
    "Student Name",
    "Username",
    "Matric Number",
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
  const safeTitle = (test?.title || "test").replace(/[^a-z0-9]/gi, "_");
  link.href = url;
  link.download = `${safeTitle}_results.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

const TeacherTests = () => {
  const [activeView, setActiveView] = useState('list');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [testToEdit, setTestToEdit] = useState(null);
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [attemptToGrade, setAttemptToGrade] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchTests(selectedCourse);
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/courses/`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch courses');
      
      const data = await response.json();
      setCourses(data);
    } catch (err) {
      toast.error('Error fetching courses: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTests = async (courseId) => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/tests/course/${courseId}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch tests');
      
      const data = await response.json();
      setTests(data);
    } catch (err) {
      toast.error('Error fetching tests: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async () => {
    if (!testToDelete) return;

    try {
      const response = await fetch(`${BASE_URL}/tests/${testToDelete.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to delete test');
      
      toast.success('Test deleted successfully!');
      setDeleteModalOpen(false);
      setTestToDelete(null);
      if (selectedCourse) {
        fetchTests(selectedCourse);
      }
    } catch (err) {
      toast.error('Error deleting test: ' + err.message);
    }
  };

  const handleToggleStatus = async (test) => {
    let newStatus;
    if (test.status === 'draft') {
      newStatus = 'active';
    } else if (test.status === 'active') {
      newStatus = 'inactive';
    } else if (test.status === 'inactive') {
      newStatus = 'active';
    } else {
      toast.error('Expired tests cannot be modified');
      return;
    }
    
    try {
      const response = await fetch(`${BASE_URL}/tests/${test.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) throw new Error('Failed to update test status');
      
      toast.success(newStatus === 'active' ? 'Test activated!' : 'Test deactivated!');
      
      setTimeout(() => {
        if (selectedCourse) {
          fetchTests(selectedCourse);
        }
      }, 500);
      
    } catch (err) {
      toast.error('Error updating test status: ' + err.message);
    }
  };

  return (
    <DashboardLayout role="teacher" userName="Dr. Teacher">
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Test Management</h1>
            <p className="text-muted-foreground mt-1">Create and manage your assessments</p>
          </div>

          {activeView === 'list' && (
            <Button onClick={() => setActiveView('create')} className="gap-2">
              <Plus className="w-4 h-4" /> Create New Test
            </Button>
          )}
        </div>

        {/* View Router */}
        {activeView === 'list' && (
          <TestListView 
            courses={courses}
            selectedCourse={selectedCourse}
            setSelectedCourse={setSelectedCourse}
            tests={tests}
            setActiveView={setActiveView}
            setSelectedTest={setSelectedTest}
            onDeleteClick={(test) => {
              setTestToDelete(test);
              setDeleteModalOpen(true);
            }}
            onEditClick={(test) => {
              setTestToEdit(test);
              setEditModalOpen(true);
            }}
            onToggleStatus={handleToggleStatus}
            loading={loading}
          />
        )}
        
        {activeView === 'create' && (
          <CreateTestView 
            courses={courses}
            setActiveView={setActiveView}
            fetchTests={fetchTests}
            selectedCourse={selectedCourse}
          />
        )}

        {activeView === 'detail' && selectedTest && (
          <TestDetailView 
            test={selectedTest}
            setActiveView={setActiveView}
          />
        )}

        {activeView === 'statistics' && selectedTest && (
          <TestStatisticsView 
            test={selectedTest}
            setActiveView={setActiveView}
            onGradeClick={(attempt) => {
              setAttemptToGrade(attempt);
              setGradingModalOpen(true);
            }}
          />
        )}

        {/* Delete Modal */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-destructive" />
                Delete Test
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{testToDelete?.title}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteTest}>
                Delete Test
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <EditTestModal
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setTestToEdit(null);
          }}
          test={testToEdit}
          courses={courses}
          onSuccess={() => {
            if (selectedCourse) {
              fetchTests(selectedCourse);
            }
          }}
        />

        {/* Grading Modal */}
        <GradingModal
          open={gradingModalOpen}
          onClose={() => {
            setGradingModalOpen(false);
            setAttemptToGrade(null);
          }}
          attempt={attemptToGrade}
          test={selectedTest}
          onSuccess={() => {
            if (selectedTest) {
              setActiveView('statistics');
            }
          }}
        />
      </div>
    </DashboardLayout>
  );
};

// Test List View
const TestListView = ({ 
  courses, selectedCourse, setSelectedCourse, tests, 
  setActiveView, setSelectedTest, onDeleteClick, onEditClick, onToggleStatus, loading 
}) => {
  return (
    <div className="space-y-6">
      {/* Course Selection */}
      <Card>
        <CardHeader>
          <Label>Select Course</Label>
        </CardHeader>
        <CardContent>
          <Select value={selectedCourse || ""} onValueChange={setSelectedCourse}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a course..." />
            </SelectTrigger>
            <SelectContent>
              {courses.map(course => (
                <SelectItem key={course.id} value={course.id}>
                  {course.course_code} - {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tests Grid */}
      {selectedCourse && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
          ) : tests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileQuestion className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No tests created yet</p>
                <Button onClick={() => setActiveView('create')}>
                  Create your first test
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tests.map((test, index) => (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card className="h-full flex flex-col group hover:border-primary/50 transition-colors">
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          test.status === 'active' ? 'bg-green-500/20 text-green-500' :
                          test.status === 'draft' ? 'bg-yellow-500/20 text-yellow-500' :
                          test.status === 'inactive' ? 'bg-orange-500/20 text-orange-500' :
                          'bg-red-500/20 text-red-500'
                        }`}>
                          {test.status}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer" onClick={() => {
                              setSelectedTest(test);
                              setActiveView('detail');
                            }}>
                              <Eye className="w-4 h-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => {
                              setSelectedTest(test);
                              setActiveView('statistics');
                            }}>
                              <BarChart3 className="w-4 h-4 mr-2" /> Statistics
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => onEditClick(test)}>
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            {test.status !== 'expired' && (
                              <DropdownMenuItem className="cursor-pointer" onClick={() => onToggleStatus(test)}>
                                <Power className="w-4 h-4 mr-2" />
                                {test.status === 'active' ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              className="text-destructive cursor-pointer"
                              onClick={() => onDeleteClick(test)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardTitle className="line-clamp-2">{test.title}</CardTitle>
                      <p className="text-sm text-muted-foreground capitalize">
                        {test.test_type?.replace('_', ' ')}
                      </p>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" /> {test.duration_minutes}m
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FileQuestion className="w-4 h-4" /> {test.question_count} Qs
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <strong>Total Marks:</strong> {test.total_marks}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setSelectedTest(test);
                          setActiveView('statistics');
                        }}
                      >
                        View Results
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Create Test View
const CreateTestView = ({ courses, setActiveView, fetchTests, selectedCourse }) => {
  const [testData, setTestData] = useState({
    course_id: selectedCourse || '',
    title: '',
    description: '',
    test_type: 'mixed',
    duration_minutes: '',
    total_marks: '',
    randomize_questions: true,
    randomize_options: true,
    start_time: '',
    end_time: '',
    questions: []
  });

  const [currentQuestion, setCurrentQuestion] = useState({
    question_type: 'multiple_choice',
    question_text: '',
    marks: '',
    options: ['', '', '', ''],
    correct_answer: '',
    acceptable_answers: []
  });
  const [hasAttempts, setHasAttempts] = useState(false);
  const [loading, setLoading] = useState(true); 
  const [submitting, setSubmitting] = useState(false);

  const addQuestion = () => {
    if (!currentQuestion.question_text || !currentQuestion.marks || parseFloat(currentQuestion.marks) <= 0) {
      toast.error('Please fill in question text and marks');
      return;
    }

    const currentTotalMarks = testData.questions.reduce((sum, q) => sum + parseFloat(q.marks), 0);
    const newTotalMarks = currentTotalMarks + parseFloat(currentQuestion.marks);
    const maxMarks = parseFloat(testData.total_marks);

    if (maxMarks && newTotalMarks > maxMarks) {
      toast.error(`Cannot add question. Total marks (${newTotalMarks}) would exceed test maximum (${maxMarks}). Remaining: ${maxMarks - currentTotalMarks} marks`);
      return;
    }

    setTestData({
      ...testData,
      questions: [...testData.questions, { ...currentQuestion, marks: parseFloat(currentQuestion.marks) }]
    });

    setCurrentQuestion({
      question_type: 'multiple_choice',
      question_text: '',
      marks: '',
      options: ['', '', '', ''],
      correct_answer: '',
      acceptable_answers: []
    });

    toast.success('Question added!');
  };

  const removeQuestion = (index) => {
    setTestData({
      ...testData,
      questions: testData.questions.filter((_, i) => i !== index)
    });
    toast.success('Question removed');
  };

  const handleSubmit = async () => {
    if (!testData.course_id || !testData.title || testData.questions.length === 0) {
      toast.error('Please fill in all required fields and add at least one question');
      return;
    }

    if (!testData.duration_minutes || !testData.total_marks) {
      toast.error('Please fill in duration and total marks');
      return;
    }
    const durationValue = Number(testData.duration_minutes);
    if (!Number.isInteger(durationValue) || durationValue < 1) {
      toast.error('Duration must be a whole number of minutes, at least 1 (for example 1 or 30).');
      return;
    }

    const questionsTotalMarks = testData.questions.reduce((sum, q) => sum + parseFloat(q.marks), 0);
    const testTotalMarks = parseFloat(testData.total_marks);

    if (questionsTotalMarks !== testTotalMarks) {
      toast.error(`Total question marks (${questionsTotalMarks}) must equal test total marks (${testTotalMarks})`);
      return;
    }

    try {
      setSubmitting(true);
      
      const payload = {
        ...testData,
        duration_minutes: parseInt(testData.duration_minutes),
        total_marks: parseFloat(testData.total_marks),
        start_time: testData.start_time ? new Date(testData.start_time).toISOString() : null,
        end_time: testData.end_time ? new Date(testData.end_time).toISOString() : null
      };

      const response = await fetch(`${BASE_URL}/tests/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create test');
      }

      toast.success('Test created successfully!');
      
      if (testData.course_id && fetchTests) {
        await fetchTests(testData.course_id);
      }
      
      setActiveView('list');
    } catch (err) {
      toast.error('Error creating test: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Create New Test</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setActiveView('list')}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Course *</Label>
              <Select value={testData.course_id} onValueChange={(val) => setTestData({...testData, course_id: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.course_code} - {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Test Title *</Label>
              <Input
                value={testData.title}
                onChange={(e) => setTestData({...testData, title: e.target.value})}
                placeholder="e.g., Midterm Exam"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Description</Label>
              <Textarea
                value={testData.description}
                onChange={(e) => setTestData({...testData, description: e.target.value})}
                placeholder="Test instructions..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Test Type</Label>
              <Select value={testData.test_type} onValueChange={(val) => setTestData({...testData, test_type: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="subjective">Subjective</SelectItem>
                  <SelectItem value="theory">Theory</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration (minutes) *</Label>
              <Input
                type="number"
                value={testData.duration_minutes}
                onChange={(e) => setTestData({...testData, duration_minutes: e.target.value})}
                placeholder="60"
                min="1"
                step="1"
              />
            </div>

            <div className="space-y-2">
              <Label>Total Marks *</Label>
              <Input
                type="number"
                value={testData.total_marks}
                onChange={(e) => setTestData({...testData, total_marks: e.target.value})}
                placeholder="100"
                min="1"
                step="0.5"
              />
            </div>

            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="datetime-local"
                value={testData.start_time}
                onChange={(e) => setTestData({...testData, start_time: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>End Time (Expiry)</Label>
              <Input
                type="datetime-local"
                value={testData.end_time}
                onChange={(e) => setTestData({...testData, end_time: e.target.value})}
              />
            </div>

            <div className="col-span-2 flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={testData.randomize_questions}
                  onChange={(e) => setTestData({...testData, randomize_questions: e.target.checked})}
                  className="rounded"
                />
                <span className="text-sm">Randomize Questions</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={testData.randomize_options}
                  onChange={(e) => setTestData({...testData, randomize_options: e.target.checked})}
                  className="rounded"
                />
                <span className="text-sm">Randomize Options (MCQ)</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Builder */}
      <Card>
        <CardHeader>
          <CardTitle>Add Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <QuestionBuilder 
            currentQuestion={currentQuestion}
            setCurrentQuestion={setCurrentQuestion}
            addQuestion={addQuestion}
          />
        </CardContent>
      </Card>

      {/* Questions List */}
      {testData.questions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Questions Added ({testData.questions.length})</CardTitle>
              {testData.total_marks && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Total Marks:</span>
                  <span className={`text-lg font-bold ${
                    testData.questions.reduce((sum, q) => sum + parseFloat(q.marks), 0) === parseFloat(testData.total_marks)
                      ? 'text-green-600'
                      : testData.questions.reduce((sum, q) => sum + parseFloat(q.marks), 0) > parseFloat(testData.total_marks)
                      ? 'text-red-600'
                      : 'text-orange-600'
                  }`}>
                    {testData.questions.reduce((sum, q) => sum + parseFloat(q.marks), 0)} / {testData.total_marks}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {testData.questions.map((q, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium">Q{index + 1}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {q.question_type.replace('_', ' ')}
                      </span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        {q.marks} marks
                      </span>
                    </div>
                    <p className="text-sm mb-2">{q.question_text}</p>
                    
                    {q.question_type === 'multiple_choice' && q.options && (
                      <div className="space-y-1 text-sm">
                        {q.options.map((opt, i) => (
                          <div key={i} className={`${opt === q.correct_answer ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                            {String.fromCharCode(65 + i)}. {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeQuestion(index)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => setActiveView('list')} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Create Test
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

// Question Builder Component
const QuestionBuilder = ({ currentQuestion, setCurrentQuestion, addQuestion }) => {
  const updateOption = (index, value) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = value;
    setCurrentQuestion({ ...currentQuestion, options: newOptions });
  };

  const addAcceptableAnswer = () => {
    setCurrentQuestion({
      ...currentQuestion,
      acceptable_answers: [...currentQuestion.acceptable_answers, '']
    });
  };

  const updateAcceptableAnswer = (index, value) => {
    const newAnswers = [...currentQuestion.acceptable_answers];
    newAnswers[index] = value;
    setCurrentQuestion({ ...currentQuestion, acceptable_answers: newAnswers });
  };

  return (
    <div className="space-y-4 border rounded-lg p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Question Type</Label>
          <Select value={currentQuestion.question_type} onValueChange={(val) => setCurrentQuestion({...currentQuestion, question_type: val})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
              <SelectItem value="fill_in_blank">Fill in the Blank</SelectItem>
              <SelectItem value="theory">Theory</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Marks</Label>
          <Input
            type="number"
            value={currentQuestion.marks}
            onChange={(e) => setCurrentQuestion({ ...currentQuestion, marks: e.target.value })}
            placeholder="Enter marks"
            min="0"
            step="0.5"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Question Text</Label>
        <Textarea
          value={currentQuestion.question_text}
          onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_text: e.target.value })}
          rows={3}
          placeholder="Enter your question here..."
        />
      </div>

      {/* Multiple Choice Options */}
      {currentQuestion.question_type === 'multiple_choice' && (
        <div className="space-y-4">
          <Label>Options</Label>
          <div className="space-y-2">
            {currentQuestion.options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-sm font-medium w-8">
                  {String.fromCharCode(65 + index)}.
                </span>
                <Input
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + index)}`}
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Correct Answer</Label>
            <Select 
              value={currentQuestion.correct_answer} 
              onValueChange={(val) => setCurrentQuestion({...currentQuestion, correct_answer: val})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select correct answer" />
              </SelectTrigger>
              <SelectContent>
                {currentQuestion.options.filter(opt => opt).map((option, index) => (
                  <SelectItem key={index} value={option}>
                    {String.fromCharCode(65 + index)}. {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Fill in the Blank */}
      {currentQuestion.question_type === 'fill_in_blank' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Correct Answer</Label>
            <Input
              value={currentQuestion.correct_answer}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, correct_answer: e.target.value })}
              placeholder="Enter the correct answer"
            />
          </div>

          <div className="space-y-2">
            <Label>Additional Acceptable Answers (Optional)</Label>
            {currentQuestion.acceptable_answers.map((answer, index) => (
              <Input
                key={index}
                value={answer}
                onChange={(e) => updateAcceptableAnswer(index, e.target.value)}
                placeholder={`Alternative answer ${index + 1}`}
              />
            ))}
            <Button
              type="button"
              variant="link"
              onClick={addAcceptableAnswer}
              className="p-0 h-auto"
            >
              + Add Alternative Answer
            </Button>
          </div>
        </div>
      )}

      {/* Theory Note */}
      {currentQuestion.question_type === 'theory' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Theory questions require manual grading. Students will submit their answers, 
            and you'll need to grade them manually after submission.
          </p>
        </div>
      )}

      <Button onClick={addQuestion} className="w-full">
        Add Question
      </Button>
    </div>
  );
};

// Edit Test Modal
const EditTestModal = ({ open, onClose, test, courses, onSuccess }) => {
  const [editData, setEditData] = useState({
    course_id: '',
    title: '',
    description: '',
    test_type: 'mixed',
    duration_minutes: '',
    total_marks: '',
    randomize_questions: true,
    randomize_options: true,
    start_time: '',
    end_time: '',
    questions: []
  });
  
  const [currentQuestion, setCurrentQuestion] = useState({
    question_type: 'multiple_choice',
    question_text: '',
    marks: '',
    options: ['', '', '', ''],
    correct_answer: '',
    acceptable_answers: []
  });
  
  const [hasAttempts, setHasAttempts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (test && open) {
      fetchTestDetails();
    }
  }, [test, open]);

  const fetchTestDetails = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${BASE_URL}/tests/${test.id}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch test details');
      
      const data = await response.json();
      
      const questionsWithParsedData = data.questions.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        acceptable_answers: q.acceptable_answers && typeof q.acceptable_answers === 'string' 
          ? JSON.parse(q.acceptable_answers) 
          : q.acceptable_answers || []
      }));
      
      const attemptsResponse = await fetch(`${BASE_URL}/tests/${test.id}/students-status`, {
        headers: getAuthHeaders()
      });
      
      if (attemptsResponse.ok) {
        const studentsData = await attemptsResponse.json();
        const hasAnyAttempts = studentsData.some(s => s.has_attempted);
        setHasAttempts(hasAnyAttempts);
      }
      
      setEditData({
        course_id: data.course_id || '',
        title: data.title || '',
        description: data.description || '',
        test_type: data.test_type || 'mixed',
        duration_minutes: data.duration_minutes || '',
        total_marks: data.total_marks || '',
        randomize_questions: data.randomize_questions ?? true,
        randomize_options: data.randomize_options ?? true,
        start_time: data.start_time ? new Date(data.start_time).toISOString().slice(0, 16) : '',
        end_time: data.end_time ? new Date(data.end_time).toISOString().slice(0, 16) : '',
        questions: questionsWithParsedData
      });
    } catch (err) {
      toast.error('Error loading test details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    if (!currentQuestion.question_text || !currentQuestion.marks || parseFloat(currentQuestion.marks) <= 0) {
      toast.error('Please fill in question text and marks');
      return;
    }

    const currentTotalMarks = editData.questions.reduce((sum, q) => sum + parseFloat(q.marks), 0);
    const newTotalMarks = currentTotalMarks + parseFloat(currentQuestion.marks);
    const maxMarks = parseFloat(editData.total_marks);

    if (maxMarks && newTotalMarks > maxMarks) {
      toast.error(`Cannot add question. Total marks (${newTotalMarks}) would exceed test maximum (${maxMarks}). Remaining: ${maxMarks - currentTotalMarks} marks`);
      return;
    }

    setEditData({
      ...editData,
      questions: [...editData.questions, { ...currentQuestion, marks: parseFloat(currentQuestion.marks) }]
    });

    setCurrentQuestion({
      question_type: 'multiple_choice',
      question_text: '',
      marks: '',
      options: ['', '', '', ''],
      correct_answer: '',
      acceptable_answers: []
    });

    toast.success('Question added!');
  };

  const removeQuestion = (index) => {
    setEditData({
      ...editData,
      questions: editData.questions.filter((_, i) => i !== index)
    });
    toast.success('Question removed');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!editData.title || !editData.duration_minutes || !editData.total_marks) {
      toast.error('Please fill in all required fields');
      return;
    }
    const durationValue = Number(editData.duration_minutes);
    if (!Number.isInteger(durationValue) || durationValue < 1) {
      toast.error('Duration must be a whole number of minutes, at least 1 (for example 1 or 30).');
      return;
    }

    if (editData.questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    const questionsTotalMarks = editData.questions.reduce((sum, q) => sum + parseFloat(q.marks), 0);
    const testTotalMarks = parseFloat(editData.total_marks);

    if (questionsTotalMarks !== testTotalMarks) {
      toast.error(`Total question marks (${questionsTotalMarks}) must equal test total marks (${testTotalMarks})`);
      return;
    }

    try {
      setSubmitting(true);
      
      const payload = {
        ...editData,
        duration_minutes: parseInt(editData.duration_minutes),
        total_marks: parseFloat(editData.total_marks),
        start_time: editData.start_time ? new Date(editData.start_time).toISOString() : null,
        end_time: editData.end_time ? new Date(editData.end_time).toISOString() : null,
        questions: editData.questions
      };

      const method = hasAttempts ? 'PATCH' : 'PUT';
      const endpoint = `${BASE_URL}/tests/${test.id}`;

      const response = await fetch(endpoint, {
        method: method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update test');
      }

      toast.success('Test updated successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Error updating test: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Test</DialogTitle>
          <DialogDescription>Update test details and questions</DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Course *</Label>
                <Select value={editData.course_id} onValueChange={(val) => setEditData({...editData, course_id: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.course_code} - {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Test Title *</Label>
                <Input
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  placeholder="e.g., Midterm Exam"
                  required
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={3}
                  placeholder="Test instructions or description..."
                />
              </div>

              <div className="space-y-2">
                <Label>Test Type</Label>
                <Select value={editData.test_type} onValueChange={(val) => setEditData({...editData, test_type: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="subjective">Subjective</SelectItem>
                    <SelectItem value="theory">Theory</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duration (minutes) *</Label>
                <Input
                  type="number"
                  value={editData.duration_minutes}
                  onChange={(e) => setEditData({ ...editData, duration_minutes: e.target.value })}
                  placeholder="Enter duration"
                  min="1"
                  step="1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Total Marks *</Label>
                <Input
                  type="number"
                  value={editData.total_marks}
                  onChange={(e) => setEditData({ ...editData, total_marks: e.target.value })}
                  placeholder="Enter total marks"
                  min="1"
                  step="0.5"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="datetime-local"
                  value={editData.start_time}
                  onChange={(e) => setEditData({ ...editData, start_time: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>End Time (Expiry)</Label>
                <Input
                  type="datetime-local"
                  value={editData.end_time}
                  onChange={(e) => setEditData({ ...editData, end_time: e.target.value })}
                />
              </div>

              <div className="col-span-2 flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editData.randomize_questions}
                    onChange={(e) => setEditData({ ...editData, randomize_questions: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Randomize Questions</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editData.randomize_options}
                    onChange={(e) => setEditData({ ...editData, randomize_options: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Randomize Options (MCQ)</span>
                </label>
              </div>

              {hasAttempts && (
                <div className="col-span-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        This test has student attempts
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        You can only edit basic test details. Questions cannot be modified for tests with attempts.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!hasAttempts && (
                <>
                  <div className="col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Edit Questions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <QuestionBuilder 
                          currentQuestion={currentQuestion}
                          setCurrentQuestion={setCurrentQuestion}
                          addQuestion={addQuestion}
                        />
                      </CardContent>
                    </Card>
                  </div>

                  {editData.questions.length > 0 && (
                    <div className="col-span-2">
                      <Card>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle>Questions ({editData.questions.length})</CardTitle>
                            {editData.total_marks && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Total Marks:</span>
                                <span className={`text-lg font-bold ${
                                  editData.questions.reduce((sum, q) => sum + parseFloat(q.marks), 0) === parseFloat(editData.total_marks)
                                    ? 'text-green-600'
                                    : editData.questions.reduce((sum, q) => sum + parseFloat(q.marks), 0) > parseFloat(editData.total_marks)
                                    ? 'text-red-600'
                                    : 'text-orange-600'
                                }`}>
                                  {editData.questions.reduce((sum, q) => sum + parseFloat(q.marks), 0)} / {editData.total_marks}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {editData.questions.map((q, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm font-medium">Q{index + 1}</span>
                                    <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded">
                                      {q.question_type.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded">
                                      {q.marks} marks
                                    </span>
                                  </div>
                                  <p className="text-sm mb-2">{q.question_text}</p>
                                  
                                  {q.question_type === 'multiple_choice' && q.options && (
                                    <div className="space-y-1 text-sm">
                                      {q.options.map((opt, i) => (
                                        <div key={i} className={`${opt === q.correct_answer ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                                          {String.fromCharCode(65 + i)}. {opt}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeQuestion(index)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Update Test
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Grading Modal
const GradingModal = ({ open, onClose, attempt, test, onSuccess }) => {
  const [answers, setAnswers] = useState([]);
  const [grades, setGrades] = useState({});
  const [feedback, setFeedback] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && attempt) {
      fetchAttemptDetails();
    }
  }, [open, attempt]);

  const fetchAttemptDetails = async () => {
    try {
      setLoading(true);
      if (!attempt.attempt_id) {
        throw new Error('No attempt ID found');
      }
      
      const response = await fetch(`${BASE_URL}/tests/attempt/${attempt.attempt_id}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch attempt details');
      
      const data = await response.json();
      setAnswers(data.answers || []);
      
      const initialGrades = {};
      const initialFeedback = {};
      data.answers?.forEach(answer => {
        initialGrades[answer.question_id] = answer.marks_obtained || '';
        initialFeedback[answer.question_id] = answer.feedback || '';
      });
      setGrades(initialGrades);
      setFeedback(initialFeedback);
    } catch (err) {
      toast.error('Error loading attempt details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitGrades = async () => {
    try {
      setSubmitting(true);
      const gradingData = answers.map(answer => ({
        answer_id: answer.id,
        marks_obtained: parseFloat(grades[answer.question_id]) || 0,
        feedback: feedback[answer.question_id] || ''
      }));

      const response = await fetch(`${BASE_URL}/tests/attempt/${attempt.attempt_id}/grade`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ grades: gradingData })
      });

      if (!response.ok) throw new Error('Failed to submit grades');

      toast.success('Grades submitted successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Error submitting grades: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grade Submission</DialogTitle>
          <DialogDescription>
            Student: {attempt?.student_name || attempt?.student_username}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {answers.map((answer, index) => (
                <div key={answer.id} className="border rounded-lg p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold">Q{index + 1}.</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {answer.question_type?.replace('_', ' ') || 'theory'}
                    </span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      Max: {answer.question_marks} marks
                    </span>
                  </div>
                  <p className="font-medium">{answer.question_text}</p>

                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-2">Student's Answer:</p>
                    <p className="whitespace-pre-wrap">{answer.answer_text || 'No answer provided'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Marks Obtained *</Label>
                      <Input
                        type="number"
                        value={grades[answer.question_id] || ''}
                        onChange={(e) => setGrades({ ...grades, [answer.question_id]: e.target.value })}
                        placeholder="Enter marks"
                        min="0"
                        max={answer.question_marks}
                        step="0.5"
                      />
                    </div>

                    <div className="col-span-2 space-y-2">
                      <Label>Feedback (Optional)</Label>
                      <Textarea
                        value={feedback[answer.question_id] || ''}
                        onChange={(e) => setFeedback({ ...feedback, [answer.question_id]: e.target.value })}
                        rows={2}
                        placeholder="Provide feedback to the student..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmitGrades} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Submit Grades
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Test Statistics View
const TestStatisticsView = ({ test, setActiveView, onGradeClick }) => {
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, studentsRes] = await Promise.all([
          fetch(`${BASE_URL}/tests/${test.id}/statistics`, { headers: getAuthHeaders() }),
          fetch(`${BASE_URL}/tests/${test.id}/students-status`, { headers: getAuthHeaders() })
        ]);
        if (statsRes.ok && studentsRes.ok) {
          setStats(await statsRes.json());
          setStudents(await studentsRes.json());
        }
      } catch (err) {
        toast.error('Error loading statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [test.id]);

  const handleExportCSV = () => {
    exportToCSV({ students, test });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Test Statistics: {test.title}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setActiveView('list')}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 cursor-pointer">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Enrolled</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-2">{stats?.total_enrolled || 0}</p>
            </div>
            <div className="border dark:bg-green-950 rounded-lg p-4">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">Attempted</p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-2">{stats?.total_attempted || 0}</p>
            </div>
            <div className="border dark:bg-orange-950 rounded-lg p-4">
              <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Not Attempted</p>
              <p className="text-3xl font-bold text-orange-900 dark:text-orange-100 mt-2">{stats?.total_not_attempted || 0}</p>
            </div>
            <div className="border dark:bg-purple-950 rounded-lg p-4">
              <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Average Score</p>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-2">
                {stats?.average_score ? stats.average_score.toFixed(1) : 'N/A'}
              </p>
            </div>
          </div>

          {/* Students Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Student Attempts</h3>
              {students.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleExportCSV}
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              )}
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-100 dark:bg-gray-800 cursor-pointer">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Matric Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Score</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Submitted At</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {students.map((student) => (
                      <tr key={student.student_id} className="cursor-pointer">
                        <td className="px-4 py-3 text-sm">{student.student_name || student.student_username}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{student.matric_number}</td>
                        <td className="px-4 py-3">
                          {student.has_attempted ? (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              student.attempt_status === 'graded' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                              student.attempt_status === 'submitted' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                              student.attempt_status === 'invalidated' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                              'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            }`}>
                              {student.attempt_status}
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                              Not Attempted
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {student.score !== null ? `${student.score}/${test.total_marks}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {student.submitted_at ? new Date(student.submitted_at).toLocaleString() : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {student.has_attempted && student.attempt_status === 'submitted' && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => onGradeClick(student)}
                              className="h-auto p-0"
                            >
                              Grade Now
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Test Detail View
const TestDetailView = ({ test, setActiveView }) => {
  const [testDetail, setTestDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestDetail = async () => {
      try {
        const response = await fetch(`${BASE_URL}/tests/${test.id}`, {
          headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch test details');
        
        const data = await response.json();
        
        const questionsWithParsedData = data.questions.map(q => ({
          ...q,
          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
          acceptable_answers: q.acceptable_answers && typeof q.acceptable_answers === 'string' 
            ? JSON.parse(q.acceptable_answers) 
            : q.acceptable_answers
        }));
        
        setTestDetail({
          ...data,
          questions: questionsWithParsedData
        });
      } catch (err) {
        toast.error('Error fetching test details');
      } finally {
        setLoading(false);
      }
    };

    fetchTestDetail();
  }, [test]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!testDetail) {
    return <div className="text-center py-12">Unable to load test details</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{testDetail.title}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setActiveView('list')}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-4 gap-4 p-4 dark:bg-gray-800 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-medium">{testDetail.duration_minutes} mins</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Marks</p>
              <p className="font-medium">{testDetail.total_marks}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Questions</p>
              <p className="font-medium">{testDetail.questions.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium capitalize">{testDetail.test_type.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="space-y-6">
            {testDetail.questions.map((question, index) => (
              <div key={question.id} className="border border-gray-700 rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold">Q{index + 1}.</span>
                  <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded">
                    {question.question_type.replace('_', ' ')}
                  </span>
                  <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded">
                    {question.marks} marks
                  </span>
                </div>

                <p className="font-medium">{question.question_text}</p>

                {question.question_type === 'multiple_choice' && question.options && (
                  <div className="space-y-2 pl-8">
                    {question.options.map((option, i) => (
                      <div 
                        key={i} 
                        className={`p-3 rounded-lg ${
                          option === question.correct_answer 
                            ? 'bg-green-900/30 border border-green-500' 
                            : 'bg-gray-800 border border-gray-700'
                        }`}
                      >
                        <span className="font-medium">{String.fromCharCode(65 + i)}.</span> {option}
                        {option === question.correct_answer && (
                          <span className="ml-2 text-xs text-green-600 dark:text-green-400 font-medium">
                            ✓ Correct Answer
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {question.question_type === 'fill_in_blank' && (
                  <div className="pl-8 bg-green-900/30 border border-green-500 rounded-lg p-4">
                    <p className="text-sm">
                      <strong>Correct Answer:</strong> {question.correct_answer}
                    </p>
                    {question.acceptable_answers && question.acceptable_answers.length > 0 && (
                      <p className="text-sm mt-2">
                        <strong>Also Acceptable:</strong> {question.acceptable_answers.join(', ')}
                      </p>
                    )}
                  </div>
                )}

                {question.question_type === 'theory' && (
                  <div className="pl-8 bg-yellow-900/30 border border-yellow-500 rounded-lg p-4">
                    <p className="text-sm">
                      This question requires manual grading after student submission.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherTests;