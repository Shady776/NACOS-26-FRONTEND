import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Clock, Sparkles, User, FileText, Calendar, Award, Loader2, BookOpen, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BASE_URL } from "@/components/api/api";
import { toSafeHtml } from "@/lib/sanitize";

const API_BASE = BASE_URL;

const TeacherGrading = () => {
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [assignments, setAssignments] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState("");
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [gradingSubmission, setGradingSubmission] = useState(null);
    const [manualGrade, setManualGrade] = useState({ score: "", feedback: "" });
    const [aiCriteria, setAiCriteria] = useState("");
    const [batchGrading, setBatchGrading] = useState(false);
    const [viewingSubmission, setViewingSubmission] = useState(null);
    const [showAIDialog, setShowAIDialog] = useState(false);
    const [showManualDialog, setShowManualDialog] = useState(false);
    const [showViewDialog, setShowViewDialog] = useState(false);

    const token = localStorage.getItem("access_token");

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            fetchAssignments();
        }
    }, [selectedCourse]);

    useEffect(() => {
        if (selectedAssignment) {
            fetchSubmissions();
        }
    }, [selectedAssignment]);

    const fetchCourses = async () => {
        try {
            const res = await fetch(`${API_BASE}/assignments/courses-list`, {
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
        try {
            const res = await fetch(`${API_BASE}/assignments/course/${selectedCourse}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAssignments(data);
                setSelectedAssignment("");
                setSubmissions([]);
            }
        } catch (err) {
            toast.error("Failed to load assignments");
        }
    };

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/submissions/assignment/${selectedAssignment}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSubmissions(data);
            }
        } catch (err) {
            toast.error("Failed to load submissions");
        } finally {
            setLoading(false);
        }
    };

    const handleManualGrade = async () => {
        if (!manualGrade.score) {
            toast.error("Please enter a score");
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/submissions/${gradingSubmission.id}/grade/manual`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    score: parseFloat(manualGrade.score),
                    feedback: manualGrade.feedback || null
                })
            });

            if (res.ok) {
                toast.success("Grade submitted successfully");
                setShowManualDialog(false);
                setGradingSubmission(null);
                setManualGrade({ score: "", feedback: "" });
                fetchSubmissions();
            } else {
                const err = await res.json();
                toast.error(err.detail || "Failed to submit grade");
            }
        } catch (err) {
            toast.error("Failed to submit grade");
        }
    };

    const handleAIBatchGrade = async () => {
        if (!aiCriteria.trim()) {
            toast.error("Please provide grading criteria for AI");
            return;
        }

        setBatchGrading(true);
        try {
            const res = await fetch(`${API_BASE}/assignments/${selectedAssignment}/grade/ai-batch`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ criteria: aiCriteria })
            });

            if (res.ok) {
                const result = await res.json();
                toast.success(
                    `Batch grading completed! ${result.graded_successfully} submissions graded successfully${result.failed > 0 ? `, ${result.failed} failed` : ""}`
                );
                setShowAIDialog(false);
                setAiCriteria("");
                fetchSubmissions();
            } else {
                const err = await res.json();
                toast.error(err.detail || "AI batch grading failed");
            }
        } catch (err) {
            toast.error("AI batch grading failed");
        } finally {
            setBatchGrading(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return "U";
        return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            SUBMITTED: { label: "Submitted", variant: "default" },
            LATE: { label: "Late", variant: "destructive" },
            GRADED: { label: "Graded", variant: "secondary" }
        };
        const statusInfo = statusMap[status] || { label: status, variant: "default" };
        return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
    };

    const pendingSubmissions = submissions.filter(s => s.status !== "GRADED");
    const gradedSubmissions = submissions.filter(s => s.status === "GRADED");
    const selectedCourseData = courses.find(c => c.id === selectedCourse);
    const selectedAssignmentData = assignments.find(a => a.id === selectedAssignment);

    return (
        <DashboardLayout role="teacher" userName="Dr. Teacher">
            <div className="space-y-8 max-w-7xl mx-auto">
                <div>
                    <h1 className="text-3xl font-display font-bold">Grading & Assignments</h1>
                    <p className="text-muted-foreground mt-1">Review and grade student submissions</p>
                </div>

                {/* Course and Assignment Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            Select Course & Assignment
                        </CardTitle>
                        <CardDescription>Choose a course and assignment to view submissions</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Course</label>
                                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a course" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {courses.map((course) => (
                                            <SelectItem key={course.id} value={course.id}>
                                                {course.course_code} - {course.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Assignment</label>
                                <Select
                                    value={selectedAssignment}
                                    onValueChange={setSelectedAssignment}
                                    disabled={!selectedCourse}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an assignment" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {assignments.map((assignment) => (
                                            <SelectItem key={assignment.id} value={assignment.id}>
                                                {assignment.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {selectedAssignment && (
                            <div className="flex flex-wrap gap-3 pt-4 border-t">
                                <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
                                    <DialogTrigger asChild>
                                        <Button className="gap-2" disabled={pendingSubmissions.length === 0}>
                                            <Sparkles className="w-4 h-4" />
                                            AI Batch Grade ({pendingSubmissions.filter(s => s.content).length} text submissions)
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>AI Batch Grading</DialogTitle>
                                            <DialogDescription>
                                                Provide grading criteria for the AI to evaluate all ungraded text submissions
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Grading Criteria</label>
                                                <Textarea
                                                    placeholder="e.g., Focus on code quality, proper error handling, clear documentation, and efficient algorithms. Bonus points for creative solutions."
                                                    value={aiCriteria}
                                                    onChange={(e) => setAiCriteria(e.target.value)}
                                                    rows={6}
                                                    className="resize-none"
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    The AI will use these criteria along with the assignment description to grade submissions
                                                </p>
                                            </div>
                                            <div className="bg-muted p-4 rounded-lg">
                                                <p className="text-sm text-foreground">
                                                    <strong>Note:</strong> AI grading only works for text submissions.
                                                    File-only submissions will be skipped.
                                                </p>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setShowAIDialog(false)} disabled={batchGrading}>
                                                Cancel
                                            </Button>
                                            <Button onClick={handleAIBatchGrade} disabled={batchGrading || !aiCriteria.trim()}>
                                                {batchGrading ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Grading...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-4 h-4 mr-2" />
                                                        Start AI Grading
                                                    </>
                                                )}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <FileText className="w-4 h-4" />
                                    {submissions.length} total submissions
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Submissions Tabs */}
                {selectedAssignment && (
                    <Tabs defaultValue="pending" className="space-y-6">
                        <TabsList>
                            <TabsTrigger value="pending" className="gap-2">
                                <Clock className="w-4 h-4" />
                                Pending Review
                                <Badge variant="secondary" className="ml-1">{pendingSubmissions.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="graded" className="gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Graded
                                <Badge variant="secondary" className="ml-1">{gradedSubmissions.length}</Badge>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="pending">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : pendingSubmissions.length === 0 ? (
                                <Card>
                                    <CardContent className="py-12 text-center">
                                        <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                        <h3 className="font-semibold text-lg mb-2">All caught up!</h3>
                                        <p className="text-muted-foreground">No pending submissions to grade</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid gap-4">
                                    {pendingSubmissions.map((submission) => (
                                        <Card key={submission.id}>
                                            <CardContent className="p-6">
                                                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                                                    <div className="flex items-start gap-4 flex-1">
                                                        <Avatar className="w-12 h-12">
                                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                                {getInitials(submission.student?.full_name || submission.student?.username)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h3 className="font-semibold text-lg">
                                                                    {submission.student?.full_name || submission.student?.username}
                                                                </h3>
                                                                {getStatusBadge(submission.status)}
                                                            </div>
                                                            <p className="text-muted-foreground text-sm mb-2">
                                                                {submission.student?.matric_number && `${submission.student.matric_number} • `}
                                                                {selectedCourseData?.course_code}
                                                            </p>
                                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                                <div className="flex items-center gap-1">
                                                                    <Clock className="w-3.5 h-3.5" />
                                                                    Submitted {formatDate(submission.submitted_at)}
                                                                </div>
                                                                {submission.content && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        <FileText className="w-3 h-3 mr-1" />
                                                                        Text
                                                                    </Badge>
                                                                )}
                                                                {submission.file_url && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        <FileText className="w-3 h-3 mr-1" />
                                                                        File
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 w-full lg:w-auto">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setViewingSubmission(submission);
                                                                setShowViewDialog(true);
                                                            }}
                                                        >
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            View
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                setGradingSubmission(submission);
                                                                setShowManualDialog(true);
                                                            }}
                                                        >
                                                            <Award className="w-4 h-4 mr-2" />
                                                            Grade
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="graded">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : gradedSubmissions.length === 0 ? (
                                <Card>
                                    <CardContent className="py-12 text-center">
                                        <Award className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                        <h3 className="font-semibold text-lg mb-2">No graded submissions yet</h3>
                                        <p className="text-muted-foreground">Graded submissions will appear here</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid gap-4">
                                    {gradedSubmissions.map((submission) => (
                                        <Card key={submission.id} className="hover:shadow-md transition-shadow">
                                            <CardContent className="p-6">
                                                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                                                    <div className="flex items-start gap-4 flex-1">
                                                        <Avatar className="w-12 h-12">
                                                            <AvatarFallback className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                                                                {getInitials(submission.student?.full_name || submission.student?.username)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h3 className="font-semibold text-lg">
                                                                    {submission.student?.full_name || submission.student?.username}
                                                                </h3>
                                                                {getStatusBadge(submission.status)}
                                                            </div>
                                                            <p className="text-muted-foreground text-sm">
                                                                {submission.student?.matric_number && `${submission.student.matric_number} • `}
                                                                {selectedCourseData?.course_code}
                                                            </p>
                                                            {/* Feedback removed from card — visible in modal only */}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <div className="text-3xl font-bold text-primary">
                                                                {submission.score?.toFixed(1)}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                out of {selectedAssignmentData?.max_score}
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setViewingSubmission(submission);
                                                                setShowViewDialog(true);
                                                            }}
                                                        >
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            View
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                )}

                {!selectedAssignment && !loading && (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="font-semibold text-lg mb-2">Select Course & Assignment</h3>
                            <p className="text-muted-foreground">Choose a course and assignment to start grading</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Manual Grading Dialog */}
            <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Grade Submission</DialogTitle>
                        <DialogDescription>
                            Grading {gradingSubmission?.student?.full_name || gradingSubmission?.student?.username}'s submission
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Score (out of {selectedAssignmentData?.max_score})
                            </label>
                            <Input
                                type="number"
                                placeholder="Enter score"
                                value={manualGrade.score}
                                onChange={(e) => setManualGrade({ ...manualGrade, score: e.target.value })}
                                min="0"
                                max={selectedAssignmentData?.max_score}
                                step="0.5"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Feedback (Optional)</label>
                            <Textarea
                                placeholder="Provide feedback for the student..."
                                value={manualGrade.feedback}
                                onChange={(e) => setManualGrade({ ...manualGrade, feedback: e.target.value })}
                                rows={5}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowManualDialog(false);
                            setManualGrade({ score: "", feedback: "" });
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={handleManualGrade}>
                            Submit Grade
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Submission Dialog */}
            <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Submission Details</DialogTitle>
                        <DialogDescription>
                            {viewingSubmission?.student?.full_name || viewingSubmission?.student?.username}'s submission
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground">Student:</span>
                                <p className="font-medium">{viewingSubmission?.student?.full_name || viewingSubmission?.student?.username}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Matric Number:</span>
                                <p className="font-medium">{viewingSubmission?.student?.matric_number || "N/A"}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Submitted:</span>
                                <p className="font-medium">{viewingSubmission?.submitted_at ? new Date(viewingSubmission.submitted_at).toLocaleString() : "N/A"}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Status:</span>
                                <div className="mt-1">{viewingSubmission && getStatusBadge(viewingSubmission.status)}</div>
                            </div>
                        </div>

                        {viewingSubmission?.content && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Text Submission</label>
                                <div
                                    className="bg-muted p-4 rounded-lg prose prose-sm max-w-none max-h-96 overflow-y-auto"
                                    dangerouslySetInnerHTML={{ __html: toSafeHtml(viewingSubmission.content) }}
                                />
                            </div>
                        )}

                        {viewingSubmission?.file_url && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">File Submission</label>
                                <a
                                    href={viewingSubmission.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-blue-600 hover:underline"
                                >
                                    <FileText className="w-4 h-4" />
                                    View Submitted File
                                </a>
                            </div>
                        )}

                        {viewingSubmission?.status === "GRADED" && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Score</label>
                                    <div className="text-2xl font-bold text-primary">
                                        {viewingSubmission.score?.toFixed(1)} / {selectedAssignmentData?.max_score}
                                    </div>
                                </div>

                                {viewingSubmission?.feedback && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Feedback</label>
                                        <div className="bg-muted p-4 rounded-lg text-foreground">
                                            {viewingSubmission.feedback}
                                        </div>
                                    </div>
                                )}

                                {viewingSubmission?.graded_at && (
                                    <div className="text-sm text-muted-foreground">
                                        Graded on {new Date(viewingSubmission.graded_at).toLocaleString()}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
};

export default TeacherGrading;