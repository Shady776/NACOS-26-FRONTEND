import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Clock, Sparkles, User, FileText, Calendar, Award, Loader2, BookOpen, Eye, Download, AlertCircle, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BASE_URL } from "@/components/api/api";
import { toSafeHtml } from "@/lib/sanitize";
import { usePolling } from "@/lib/usePolling";

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
    const [viewingSubmission, setViewingSubmission] = useState(null);
    const [showAIDialog, setShowAIDialog] = useState(false);
    const [showManualDialog, setShowManualDialog] = useState(false);
    const [showViewDialog, setShowViewDialog] = useState(false);
    // AI grading: aiTarget is null for a batch run, or the one submission being graded.
    const [aiTarget, setAiTarget] = useState(null);
    const [aiScope, setAiScope] = useState("all");
    const [aiBusy, setAiBusy] = useState(false);
    const [job, setJob] = useState(null);
    const [showJobErrors, setShowJobErrors] = useState(false);
    const [filter, setFilter] = useState("all");
    const [downloadingId, setDownloadingId] = useState(null);

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
        setJob(null);
        setShowJobErrors(false);
        if (selectedAssignment) {
            fetchSubmissions();
            // Resume the progress display only if a run is still going; old finished runs stay hidden.
            fetchJob().then(latest => { if (latest && latest.status !== "running") setJob(null); });
            const saved = assignments.find(a => a.id === selectedAssignment);
            setAiCriteria(saved?.grading_criteria || "");
        }
    }, [selectedAssignment]);

    // While a batch run is going, check on it every 2 seconds (paused in hidden tabs).
    usePolling(async () => {
        const latest = await fetchJob();
        if (!latest) return;
        fetchSubmissions(true);
        if (latest.status === "done") {
            toast.success(`AI grading finished: ${latest.graded} graded${latest.failed ? `, ${latest.failed} need your attention` : ""}`);
        } else if (latest.status === "error") {
            toast.error(latest.message || "AI grading stopped unexpectedly");
        }
    }, 2000, job?.status === "running");

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

    const fetchJob = async () => {
        try {
            const res = await fetch(`${API_BASE}/assignments/${selectedAssignment}/grade/ai-batch/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setJob(data.status === "idle" ? null : data);
                return data;
            }
        } catch (err) {
            /* a missed poll is harmless: the next one catches up */
        }
        return null;
    };

    const fetchSubmissions = async (silent = false) => {
        if (!silent) setLoading(true);
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
            if (!silent) setLoading(false);
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

    const openAIDialog = (submission = null) => {
        setAiTarget(submission);
        setShowAIDialog(true);
    };

    const handleAIGrade = async () => {
        if (!aiCriteria.trim()) {
            toast.error("Please provide grading criteria for AI");
            return;
        }

        setAiBusy(true);
        try {
            const single = !!aiTarget;
            const res = await fetch(
                single
                    ? `${API_BASE}/submissions/${aiTarget.id}/grade/ai`
                    : `${API_BASE}/assignments/${selectedAssignment}/grade/ai-batch`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(single ? { criteria: aiCriteria } : { criteria: aiCriteria, scope: aiScope })
                }
            );

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                toast.error(data?.detail || "AI grading failed");
                return;
            }

            setShowAIDialog(false);
            if (single) {
                toast.success(`Graded: ${data.score} / ${selectedAssignmentData?.max_score}`);
            } else {
                setJob(data);
                setShowJobErrors(false);
                toast.success(`AI grading started for ${data.total} submission${data.total === 1 ? "" : "s"}`);
            }
            fetchSubmissions(true);
            // keep the saved criteria in the list so reopening the dialog shows them
            setAssignments(prev => prev.map(a => a.id === selectedAssignment ? { ...a, grading_criteria: aiCriteria.trim() } : a));
        } catch (err) {
            toast.error("AI grading failed");
        } finally {
            setAiBusy(false);
        }
    };

    const getFileExtension = (url) => {
        const match = /\.([a-z0-9]{1,8})(?:\?|$)/i.exec(url || "");
        return match ? match[1].toLowerCase() : "";
    };

    const handleDownloadFile = async (submission) => {
        setDownloadingId(submission.id);
        try {
            const res = await fetch(`${API_BASE}/submissions/${submission.id}/file`);
            if (!res.ok) {
                const err = await res.json().catch(() => null);
                throw new Error(err?.detail || "Could not download the file");
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const who = submission.student?.matric_number || submission.student?.username || "student";
            const ext = getFileExtension(submission.file_url);
            link.href = url;
            link.download = `${who}_${selectedAssignmentData?.title || "submission"}${ext ? `.${ext}` : ""}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setDownloadingId(null);
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

    // "files" = has an attached file (typed text may come with it); "text" = typed answer only.
    const kindOf = (s) => (s.file_url ? "files" : "text");
    const matchesFilter = (s) => filter === "all" || kindOf(s) === filter;
    const pendingSubmissions = submissions.filter(s => s.status !== "GRADED" && matchesFilter(s));
    const gradedSubmissions = submissions.filter(s => s.status === "GRADED" && matchesFilter(s));
    const gradableCount = (scope) =>
        submissions.filter(s => s.status !== "GRADED" && (s.content || s.file_url) && (scope === "all" || kindOf(s) === scope)).length;
    const kindCounts = {
        all: submissions.length,
        text: submissions.filter(s => kindOf(s) === "text").length,
        files: submissions.filter(s => kindOf(s) === "files").length,
    };
    const jobRunning = job?.status === "running";
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
                                <Button
                                    className="gap-2"
                                    onClick={() => openAIDialog(null)}
                                    disabled={gradableCount("all") === 0 || jobRunning}
                                >
                                    {jobRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    AI Grade Ungraded ({gradableCount("all")})
                                </Button>

                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <FileText className="w-4 h-4" />
                                    {submissions.length} total submissions
                                </div>
                            </div>
                        )}

                        {selectedAssignment && job && (
                            <div className="rounded-lg border p-4 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium flex items-center gap-2">
                                        {jobRunning ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> AI is grading: {job.processed} of {job.total} done</>
                                        ) : job.status === "error" ? (
                                            <><AlertCircle className="w-4 h-4 text-destructive" /> {job.message || "AI grading stopped unexpectedly"}</>
                                        ) : (
                                            <><CheckCircle2 className="w-4 h-4 text-green-600" /> AI grading finished: {job.graded} graded{job.skipped ? `, ${job.skipped} already graded` : ""}{job.failed ? `, ${job.failed} failed` : ""}</>
                                        )}
                                    </p>
                                    {!jobRunning && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setJob(null)} aria-label="Dismiss">
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                                <Progress value={job.total ? (job.processed / job.total) * 100 : 0} className="h-2" />
                                {!jobRunning && job.failed > 0 && (
                                    <div className="space-y-2">
                                        <Button variant="link" className="h-auto p-0 text-sm" onClick={() => setShowJobErrors(v => !v)}>
                                            {showJobErrors ? "Hide" : "Show"} the {job.failed} that need your attention
                                        </Button>
                                        {showJobErrors && (
                                            <ul className="text-sm space-y-1">
                                                {job.errors.map((e) => (
                                                    <li key={e.submission_id} className="text-muted-foreground">
                                                        <span className="font-medium text-foreground">{e.student}:</span> {e.reason}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        <p className="text-xs text-muted-foreground">These stay in Pending Review so you can grade them by hand or try again.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Submissions Tabs */}
                {selectedAssignment && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-muted-foreground mr-1">Show:</span>
                        {[
                            { key: "all", label: "All" },
                            { key: "text", label: "Text" },
                            { key: "files", label: "Files" },
                        ].map(chip => (
                            <Button
                                key={chip.key}
                                size="sm"
                                variant={filter === chip.key ? "default" : "outline"}
                                className="rounded-full h-8"
                                onClick={() => setFilter(chip.key)}
                            >
                                {chip.label} ({kindCounts[chip.key]})
                            </Button>
                        ))}
                    </div>
                )}

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
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={jobRunning || (!submission.content && !submission.file_url)}
                                                            onClick={() => openAIDialog(submission)}
                                                        >
                                                            <Sparkles className="w-4 h-4 mr-2" />
                                                            AI Grade
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

            {/* AI Grading Dialog (one submission, or every ungraded one) */}
            <Dialog open={showAIDialog} onOpenChange={(open) => { if (!aiBusy) setShowAIDialog(open); }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {aiTarget ? "AI Grade Submission" : "AI Grade Ungraded Submissions"}
                        </DialogTitle>
                        <DialogDescription>
                            {aiTarget
                                ? `The AI will grade ${aiTarget.student?.full_name || aiTarget.student?.username}'s work and the student will be notified.`
                                : "The AI grades the ungraded submissions you pick below, in the background. You can leave this page open and watch the progress."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {!aiTarget && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Which submissions</label>
                                <Select value={aiScope} onValueChange={setAiScope}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All ungraded ({gradableCount("all")})</SelectItem>
                                        <SelectItem value="text">Typed answers only ({gradableCount("text")})</SelectItem>
                                        <SelectItem value="files">With an attached file ({gradableCount("files")})</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Grading Criteria</label>
                            <Textarea
                                placeholder="e.g., Focus on code quality, proper error handling, clear documentation, and efficient algorithms."
                                value={aiCriteria}
                                onChange={(e) => setAiCriteria(e.target.value)}
                                rows={6}
                                className="resize-none"
                            />
                            <p className="text-xs text-muted-foreground">
                                Used together with the assignment description. Saved for this assignment, so you only type it once.
                            </p>
                        </div>
                        <div className="bg-muted p-4 rounded-lg">
                            <p className="text-sm text-foreground">
                                <strong>What the AI can read:</strong> typed answers, code files, PDFs, Word documents and ZIP projects.
                                Photos and scanned pages are read with a vision model when the server has one set up.
                                Anything it can't read is listed afterwards so you can grade it by hand.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAIDialog(false)} disabled={aiBusy}>
                            Cancel
                        </Button>
                        <Button onClick={handleAIGrade} disabled={aiBusy || !aiCriteria.trim()}>
                            {aiBusy ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {aiTarget ? "Grading..." : "Starting..."}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    {aiTarget ? "Grade with AI" : "Start AI Grading"}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    disabled={downloadingId === viewingSubmission.id}
                                    onClick={() => handleDownloadFile(viewingSubmission)}
                                >
                                    {downloadingId === viewingSubmission.id
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <Download className="w-4 h-4" />}
                                    Download submitted file
                                </Button>
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