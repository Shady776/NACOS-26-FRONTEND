import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Calendar, CheckCircle2, Clock, Upload, ChevronRight, X, Send, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, MessageSquare, Eye, Loader2, Edit2, Paperclip, Download } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { toSafeHtml } from "@/lib/sanitize";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BASE_URL } from "@/components/api/api";
import { toast } from "sonner";

// Matches the backend limit in submissions.py
const MAX_SUBMISSION_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Extension of a stored file, read from its URL ('bin' if there isn't a real one).
const getStoredFileExtension = (fileUrl?: string | null) => {
    const name = (fileUrl || '').split('?')[0].split('/').pop() || '';
    const match = name.match(/\.([A-Za-z0-9]{1,8})$/);
    return match && !/^\d+$/.test(match[1]) ? match[1].toLowerCase() : 'bin';
};

const Spinner = () => (
    <div className="flex items-center justify-center h-64">
        <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Loading assignments...</p>
        </div>
    </div>
);

const StudentAssignments = () => {
    const [searchParams] = useSearchParams();

    const [activeTab, setActiveTab] = useState("pending");
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showContent, setShowContent] = useState(false);

    // ── Notification-driven search: ?notif=<assignment_id> pre-selects that assignment ──
    // We store the highlighted assignment id; the card gets a visual ring and tabs
    // automatically switch to the correct tab.
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    
    // Submission Modal States
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [submissionText, setSubmissionText] = useState('');
    const [submissionFile, setSubmissionFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const editorRef = useRef(null);
    const submitFileInputRef = useRef<HTMLInputElement>(null);
    
    // View Submission Modal States
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewingSubmission, setViewingSubmission] = useState(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    
    // Feedback Modal States
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    
    const [isClosingModal, setIsClosingModal] = useState(false);

    const editorRefEdit = useRef(null);
    const editFileInputRef = useRef<HTMLInputElement>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingSubmission, setEditingSubmission] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [editFile, setEditFile] = useState<File | null>(null);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchAssignments();
    }, []);

    // Once assignments load, handle the ?notif= param
    useEffect(() => {
        const notifId = searchParams.get("notif");
        if (!notifId || assignments.length === 0) return;

        setHighlightedId(notifId);

        // Find which tab this assignment belongs to and switch to it
        const match = assignments.find((a) => a.id === notifId);
        if (match) {
            const status = getAssignmentStatus(match);
            if (status === "Pending")   setActiveTab("pending");
            if (status === "Submitted") setActiveTab("submitted");
            if (status === "Graded")    setActiveTab("graded");

            // Scroll to card after a short delay (tabs need to render first)
            setTimeout(() => {
                document.getElementById(`assignment-card-${notifId}`)?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            }, 300);
        }

        // Clear the highlight after 5s so it doesn't stay forever
        const timeout = setTimeout(() => setHighlightedId(null), 5000);
        return () => clearTimeout(timeout);
    }, [assignments, searchParams]);

    const fetchAssignments = async () => {
        const startTime = Date.now();
        try {
            setLoading(true);
            setShowContent(false);
            const token = localStorage.getItem('access_token');
            
            const response = await fetch(`${BASE_URL}/assignments/student/my-assignments`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to fetch assignments');
            }

            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(2000 - elapsedTime, 0);
            
            setTimeout(() => {
                setAssignments(data);
                setLoading(false);
                setTimeout(() => setShowContent(true), 50);
            }, remainingTime);
        } catch (err) {
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(2000 - elapsedTime, 0);
            
            setTimeout(() => {
                setError(err.message);
                setLoading(false);
                setTimeout(() => setShowContent(true), 50);
            }, remainingTime);
        }
    };

    // ── file helpers ─────────────────────────────────────────────────────────

    // The backend decides which file types are allowed and shows its own message;
    // here we only catch the obvious problems before uploading.
    const pickFile = (fileList: FileList | null, setter: (file: File) => void) => {
        const file = fileList?.[0];
        if (!file) return;
        if (file.size === 0) {
            toast.error('That file is empty');
            return;
        }
        if (file.size > MAX_SUBMISSION_FILE_SIZE) {
            toast.error('That file is too large. The limit is 50 MB');
            return;
        }
        setter(file);
    };

    const handleDownloadFile = async (submission) => {
        try {
            setDownloadingId(submission.id);
            const response = await fetch(`${BASE_URL}/submissions/${submission.id}/file`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.detail || 'Could not download the file');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${submission.assignment?.title || 'submission'}.${getStoredFileExtension(submission.file_url)}`;
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

    // ── submit ───────────────────────────────────────────────────────────────

    const handleSubmitClick = (assignment) => {
        setSelectedAssignment(assignment);
        setSubmissionText('');
        setSubmissionFile(null);
        if (editorRef.current) {
            editorRef.current.innerHTML = '';
        }
        setIsClosingModal(false);
        setShowSubmitModal(true);
    };

    const handleCloseSubmitModal = () => {
        setIsClosingModal(true);
        setTimeout(() => {
            setShowSubmitModal(false);
            setSelectedAssignment(null);
            setSubmissionText('');
            setSubmissionFile(null);
            setIsClosingModal(false);
            if (editorRef.current) {
                editorRef.current.innerHTML = '';
            }
        }, 300);
    };

    const applyFormatting = (command, value = null) => {
        document.execCommand(command, false, value);
        editorRef.current.focus();
    };

    const insertParagraph = () => {
        document.execCommand('insertHTML', false, '<br><br>');
        editorRef.current.focus();
    };

    const handleEditorInput = () => {
        if (editorRef.current) {
            setSubmissionText(editorRef.current.innerHTML);
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertHTML', false, text);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedAssignment) return;

        const textContent = editorRef.current?.innerHTML.trim() || '';
        const plainText = editorRef.current?.innerText.trim() || '';

        if (!plainText && !submissionFile) {
            toast.error('Type your answer or attach a file');
            return;
        }

        try {
            setSubmitting(true);
            const token = localStorage.getItem('access_token');
            
            const formData = new FormData();
            formData.append('assignment_id', selectedAssignment.id);
            if (plainText) {
                formData.append('content', textContent);
            }
            if (submissionFile) {
                formData.append('file', submissionFile);
            }

            const response = await fetch(`${BASE_URL}/submissions/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 422) {
                    const errorDetails = data.detail?.map(err => err.msg).join(', ') || 'Validation error';
                    throw new Error(errorDetails);
                }
                throw new Error(data.detail || 'Submission failed');
            }

            toast.success('Assignment submitted successfully!');
            handleCloseSubmitModal();
            fetchAssignments();
        } catch (err) {
            toast.error(err.message);
            console.error('Submission error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleViewSubmission = async (assignment) => {
        try {
            const token = localStorage.getItem('access_token');
            
            const response = await fetch(`${BASE_URL}/submissions/my-submissions`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const submissions = await response.json();

            if (!response.ok) {
                throw new Error('Failed to fetch submission');
            }

            const submission = submissions.find(sub => sub.assignment?.id === assignment.id);
            
            if (submission) {
                setViewingSubmission(submission);
                setIsClosingModal(false);
                setShowViewModal(true);
            } else {
                toast.error('Submission not found');
            }
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleViewFeedback = async (assignment) => {
        try {
            const token = localStorage.getItem('access_token');
            
            const response = await fetch(`${BASE_URL}/submissions/my-submissions`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const submissions = await response.json();

            if (!response.ok) {
                throw new Error('Failed to fetch feedback');
            }

            const submission = submissions.find(sub => sub.assignment?.id === assignment.id);
            
            if (submission && submission.feedback) {
                setSelectedFeedback(submission);
                setIsClosingModal(false);
                setShowFeedbackModal(true);
            } else {
                toast.info('No feedback available yet');
            }
        } catch (err) {
            toast.error(err.message);
        }
    };

    const closeViewModal = () => {
        setIsClosingModal(true);
        setTimeout(() => {
            setShowViewModal(false);
            setViewingSubmission(null);
            setIsClosingModal(false);
        }, 300);
    };

    const closeFeedbackModal = () => {
        setIsClosingModal(true);
        setTimeout(() => {
            setShowFeedbackModal(false);
            setSelectedFeedback(null);
            setIsClosingModal(false);
        }, 300);
    };

    // ── edit ─────────────────────────────────────────────────────────────────

    const handleEditClick = async (assignment) => {
        try {
            const token = localStorage.getItem('access_token');
            
            const response = await fetch(`${BASE_URL}/submissions/my-submissions`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const submissions = await response.json();

            if (!response.ok) {
                throw new Error('Failed to fetch submission');
            }

            const submission = submissions.find(sub => sub.assignment?.id === assignment.id);
            
            if (submission) {
                setEditingSubmission(submission);
                setEditContent(submission.content || '');
                setEditFile(null);
                setIsClosingModal(false);
                setShowEditModal(true);
                
                setTimeout(() => {
                    if (editorRefEdit.current) {
                        editorRefEdit.current.innerHTML = submission.content || '';
                    }
                }, 100);
            } else {
                toast.error('Submission not found');
            }
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleEditorEditInput = () => {
        if (editorRefEdit.current) {
            setEditContent(editorRefEdit.current.innerHTML);
        }
    };

    const applyFormattingEdit = (command, value = null) => {
        document.execCommand(command, false, value);
        editorRefEdit.current.focus();
    };

    const insertParagraphEdit = () => {
        document.execCommand('insertHTML', false, '<br><br>');
        editorRefEdit.current.focus();
    };

    const handleEditSubmit = async () => {
        if (!editingSubmission) return;

        const plainText = editorRefEdit.current?.innerText.trim() || '';
        
        if (!plainText && !editFile && !editingSubmission.file_url) {
            toast.error('Type your answer or attach a file');
            return;
        }

        try {
            setUpdating(true);
            const token = localStorage.getItem('access_token');
            const formData = new FormData();
            
            formData.append('content', plainText ? editContent : '');
            if (editFile) {
                formData.append('file', editFile);
            }

            const response = await fetch(`${BASE_URL}/submissions/${editingSubmission.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to update submission');
            }

            toast.success('Submission updated successfully!');
            closeEditModal();
            fetchAssignments();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setUpdating(false);
        }
    };

    const closeEditModal = () => {
        setIsClosingModal(true);
        setTimeout(() => {
            setShowEditModal(false);
            setEditingSubmission(null);
            setEditContent('');
            setEditFile(null);
            setIsClosingModal(false);
            if (editorRefEdit.current) {
                editorRefEdit.current.innerHTML = '';
            }
        }, 300);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'TBD';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case "high": return "text-destructive bg-destructive/10";
            case "medium": return "text-yellow-600 bg-yellow-500/10";
            default: return "text-primary bg-primary/10";
        }
    };

    const getAssignmentStatus = (assignment) => {
        if (assignment.grade !== null && assignment.grade !== undefined) {
            return 'Graded';
        } else if (assignment.status === 'Submitted' || assignment.submission_status === 'Submitted') {
            return 'Submitted';
        } else {
            return 'Pending';
        }
    };

    const pendingAssignments   = assignments.filter(a => getAssignmentStatus(a) === 'Pending');
    const submittedAssignments = assignments.filter(a => getAssignmentStatus(a) === 'Submitted');
    const gradedAssignments    = assignments.filter(a => getAssignmentStatus(a) === 'Graded');

    // ── Shared card wrapper — handles highlight ring ──────────────────────────
    const AssignmentCard = ({ assignment, children }) => {
        const isHighlighted = assignment.id === highlightedId;
        return (
            <div
                id={`assignment-card-${assignment.id}`}
                className={
                    isHighlighted
                        ? "ring-2 ring-primary ring-offset-2 rounded-xl transition-all duration-500"
                        : "transition-all duration-500"
                }
            >
                {children}
            </div>
        );
    };

    if (loading) {
        return (
            <DashboardLayout role="student" userName="John Doe">
                <div className="space-y-8 max-w-5xl mx-auto">
                    <Spinner />
                </div>
            </DashboardLayout>
        );
    }

    if (error && assignments.length === 0) {
        return (
            <DashboardLayout role="student" userName="John Doe">
                <div className="space-y-8 max-w-5xl mx-auto">
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
                        Error: {error}
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="student" userName="John Doe">
            <style>{`
                @keyframes modalBackdropIn  { from { opacity: 0; } to { opacity: 1; } }
                @keyframes modalBackdropOut { from { opacity: 1; } to { opacity: 0; } }
                @keyframes modalSlideIn  { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                @keyframes modalSlideOut { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.95) translateY(20px); } }
                .modal-backdrop-enter { animation: modalBackdropIn 0.3s ease-out forwards; }
                .modal-backdrop-exit  { animation: modalBackdropOut 0.3s ease-out forwards; }
                .modal-content-enter  { animation: modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .modal-content-exit   { animation: modalSlideOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .rich-text-editor {
                    min-height: 256px; max-height: 256px; overflow-y: auto;
                    padding: 16px; border: 1px solid hsl(var(--border)); border-radius: 12px;
                    outline: none; line-height: 1.75;
                    color: hsl(var(--foreground)); background: hsl(var(--background));
                }
                .rich-text-editor:focus { border-color: hsl(var(--ring)); box-shadow: 0 0 0 3px hsl(var(--ring) / 0.1); }
                .rich-text-editor:empty:before { content: attr(data-placeholder); color: hsl(var(--muted-foreground)); }
                .rich-text-editor strong, .submission-content strong { font-weight: bold; }
                .rich-text-editor em,     .submission-content em     { font-style: italic; }
                .rich-text-editor u,      .submission-content u      { text-decoration: underline; }
                .submission-content { line-height: 1.75; color: hsl(var(--foreground)); }
                .submission-content p { margin-bottom: 1em; }
            `}</style>

            <div className="space-y-8 max-w-5xl mx-auto">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-display font-bold">Assignments</h1>
                    <p className="text-muted-foreground">Manage your tasks and track your grades</p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full md:w-[400px] grid-cols-3 mb-8">
                        <TabsTrigger value="pending">Pending ({pendingAssignments.length})</TabsTrigger>
                        <TabsTrigger value="submitted">Submitted ({submittedAssignments.length})</TabsTrigger>
                        <TabsTrigger value="graded">Graded ({gradedAssignments.length})</TabsTrigger>
                    </TabsList>

                    {/* PENDING TAB */}
                    <TabsContent value="pending" className="space-y-4">
                        {pendingAssignments.map((assignment, index) => (
                            <motion.div
                                key={assignment.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                            >
                                <AssignmentCard assignment={assignment}>
                                    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-primary/50">
                                        <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="bg-background">
                                                        {assignment.course_code || assignment.course?.course_code || 'N/A'}
                                                    </Badge>
                                                    {assignment.priority && (
                                                        <Badge variant="secondary" className={getPriorityColor(assignment.priority)}>
                                                            {assignment.priority.charAt(0).toUpperCase() + assignment.priority.slice(1)} Priority
                                                        </Badge>
                                                    )}
                                                </div>
                                                <h3 className="text-lg font-semibold">{assignment.title || 'Untitled Assignment'}</h3>
                                                <p className="text-sm text-muted-foreground">{assignment.description || 'No description available'}</p>
                                                <div className="flex items-center gap-2 text-sm text-destructive font-medium pt-2">
                                                    <Clock className="w-4 h-4" />
                                                    Due: {formatDate(assignment.due_date)}
                                                </div>
                                            </div>
                                            <Button className="w-full md:w-auto gap-2" onClick={() => handleSubmitClick(assignment)}>
                                                <Upload className="w-4 h-4" /> Submit
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </AssignmentCard>
                            </motion.div>
                        ))}
                        {pendingAssignments.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500/50" />
                                <p>No active assignments! Time to relax.</p>
                            </div>
                        )}
                    </TabsContent>

                    {/* SUBMITTED TAB */}
                    <TabsContent value="submitted" className="space-y-4">
                        {submittedAssignments.map((assignment, index) => (
                            <motion.div
                                key={assignment.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                            >
                                <AssignmentCard assignment={assignment}>
                                    <Card className="hover:shadow-md transition-shadow">
                                        <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                            <div className="flex-1 space-y-2">
                                                <Badge variant="outline">
                                                    {assignment.course_code || assignment.course?.course_code || 'N/A'}
                                                </Badge>
                                                <h3 className="text-lg font-semibold">{assignment.title || 'Untitled Assignment'}</h3>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                    Submitted on {formatDate(assignment.submitted_at || assignment.submitted_date || assignment.submission_date)}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" className="gap-2" onClick={() => handleEditClick(assignment)}>
                                                    <Edit2 className="w-4 h-4" /> Edit
                                                </Button>
                                                <Button variant="outline" className="gap-2" onClick={() => handleViewSubmission(assignment)}>
                                                    <Eye className="w-4 h-4" /> View
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </AssignmentCard>
                            </motion.div>
                        ))}
                        {submittedAssignments.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No submitted assignments yet.</p>
                            </div>
                        )}
                    </TabsContent>

                    {/* GRADED TAB */}
                    <TabsContent value="graded" className="space-y-4">
                        {gradedAssignments.map((assignment, index) => (
                            <motion.div
                                key={assignment.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                            >
                                <AssignmentCard assignment={assignment}>
                                    <Card className="border-green-500/20 bg-green-500/5 hover:shadow-md transition-shadow">
                                        <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                            <div className="flex-1 space-y-2">
                                                <Badge variant="outline" className="bg-background">
                                                    {assignment.course_code || assignment.course?.course_code || 'N/A'}
                                                </Badge>
                                                <h3 className="text-lg font-semibold">{assignment.title || 'Untitled Assignment'}</h3>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Calendar className="w-4 h-4" />
                                                    {assignment.graded_at ? `Graded on ${formatDate(assignment.graded_at)}` : 'Graded'}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <span className="text-2xl font-bold text-primary">
                                                        {assignment.grade || assignment.score}/{assignment.max_score || 100}
                                                    </span>
                                                    <p className="text-xs text-muted-foreground">Score</p>
                                                </div>
                                                <Button variant="ghost" size="icon" onClick={() => handleViewFeedback(assignment)}>
                                                    <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </AssignmentCard>
                            </motion.div>
                        ))}
                        {gradedAssignments.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No graded assignments yet.</p>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* ── MODALS ── */}

            {showSubmitModal && selectedAssignment && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm ${isClosingModal ? 'modal-backdrop-exit' : 'modal-backdrop-enter'}`}>
                    <div className={`bg-background rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isClosingModal ? 'modal-content-exit' : 'modal-content-enter'}`}>
                        <div className="p-6 border-b border-border flex justify-between items-start bg-muted/50 flex-shrink-0">
                            <div>
                                <h3 className="text-xl font-bold">Submit Assignment</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {selectedAssignment.course_code || selectedAssignment.course?.course_code || 'N/A'} • {selectedAssignment.title || 'Untitled'}
                                </p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={handleCloseSubmitModal} className="rounded-full"><X className="w-5 h-5" /></Button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1" style={{ overscrollBehavior: 'contain' }}>
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center gap-2 p-3 bg-muted rounded-lg border border-border">
                                    <div className="flex items-center gap-1 border-r border-border pr-2">
                                        <Button type="button" variant="ghost" size="sm" onClick={() => applyFormatting('bold')} className="h-8 w-8 p-0"><Bold className="h-4 w-4" /></Button>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => applyFormatting('italic')} className="h-8 w-8 p-0"><Italic className="h-4 w-4" /></Button>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => applyFormatting('underline')} className="h-8 w-8 p-0"><Underline className="h-4 w-4" /></Button>
                                    </div>
                                    <div className="flex items-center gap-1 border-r border-border pr-2">
                                        <Button type="button" variant="ghost" size="sm" onClick={() => applyFormatting('justifyLeft')} className="h-8 w-8 p-0"><AlignLeft className="h-4 w-4" /></Button>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => applyFormatting('justifyCenter')} className="h-8 w-8 p-0"><AlignCenter className="h-4 w-4" /></Button>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => applyFormatting('justifyRight')} className="h-8 w-8 p-0"><AlignRight className="h-4 w-4" /></Button>
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={insertParagraph} className="text-xs h-8">¶ Paragraph</Button>
                                </div>
                                <div ref={editorRef} contentEditable={true} onInput={handleEditorInput} onPaste={handlePaste} className="rich-text-editor" data-placeholder="Type your answer here..." />

                                {/* File attachment */}
                                <div className="space-y-2">
                                    <input
                                        ref={submitFileInputRef}
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => {
                                            pickFile(e.target.files, setSubmissionFile);
                                            e.target.value = ''; // lets the same file be picked again
                                        }}
                                    />
                                    {submissionFile ? (
                                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileText className="w-4 h-4 shrink-0 text-primary" />
                                                <span className="truncate">{submissionFile.name}</span>
                                                <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(submissionFile.size)}</span>
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSubmissionFile(null)} disabled={submitting} aria-label="Remove file">
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button type="button" variant="outline" className="gap-2" onClick={() => submitFileInputRef.current?.click()} disabled={submitting}>
                                            <Paperclip className="w-4 h-4" /> Attach a file
                                        </Button>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        Optional if you typed an answer. PDF, Word, PowerPoint, ZIP or RAR, images, and code or text files, up to 50 MB.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/50 flex-shrink-0">
                            <Button variant="outline" onClick={handleCloseSubmitModal} disabled={submitting}>Cancel</Button>
                            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</> : <><Send className="w-4 h-4" />Submit Assignment</>}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showViewModal && viewingSubmission && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm ${isClosingModal ? 'modal-backdrop-exit' : 'modal-backdrop-enter'}`}>
                    <div className={`bg-background rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isClosingModal ? 'modal-content-exit' : 'modal-content-enter'}`}>
                        <div className="p-6 border-b border-border flex justify-between items-start bg-muted/50 flex-shrink-0">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2"><Eye className="w-5 h-5" />Your Submission</h3>
                                <p className="text-sm text-muted-foreground mt-1">{viewingSubmission.assignment?.title || 'Assignment'}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={closeViewModal} className="rounded-full"><X className="w-5 h-5" /></Button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1" style={{ overscrollBehavior: 'contain' }}>
                            <div className="bg-muted rounded-xl p-4 mb-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-muted-foreground">Submitted on:</span>
                                    <span className="text-sm font-bold">{formatDate(viewingSubmission.submitted_at)}</span>
                                </div>
                            </div>

                            {viewingSubmission.file_url && (
                                <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-4 mb-4">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="w-5 h-5 shrink-0 text-primary" />
                                        <span className="text-sm font-medium truncate">
                                            Attached file ({getStoredFileExtension(viewingSubmission.file_url).toUpperCase()})
                                        </span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 shrink-0"
                                        onClick={() => handleDownloadFile(viewingSubmission)}
                                        disabled={downloadingId === viewingSubmission.id}
                                    >
                                        {downloadingId === viewingSubmission.id
                                            ? <><Loader2 className="w-4 h-4 animate-spin" />Downloading...</>
                                            : <><Download className="w-4 h-4" />Download</>}
                                    </Button>
                                </div>
                            )}

                            {viewingSubmission.content && (
                                <div className="submission-content prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: toSafeHtml(viewingSubmission.content) }} />
                            )}
                        </div>
                        <div className="p-6 border-t border-border flex justify-end flex-shrink-0">
                            <Button onClick={closeViewModal}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {showFeedbackModal && selectedFeedback && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm ${isClosingModal ? 'modal-backdrop-exit' : 'modal-backdrop-enter'}`}>
                    <div className={`bg-background rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isClosingModal ? 'modal-content-exit' : 'modal-content-enter'}`}>
                        <div className="p-6 border-b border-border flex justify-between items-start bg-green-500/10 flex-shrink-0">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2"><MessageSquare className="w-5 h-5 text-green-600" />Teacher Feedback</h3>
                                <p className="text-sm text-muted-foreground mt-1">{selectedFeedback.assignment?.title || 'Assignment'}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={closeFeedbackModal} className="rounded-full"><X className="w-5 h-5" /></Button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1" style={{ overscrollBehavior: 'contain' }}>
                            <div className="bg-muted rounded-xl p-4 mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-muted-foreground">Your Score:</span>
                                    <span className="text-2xl font-bold text-green-600">{selectedFeedback.score || selectedFeedback.grade}/{selectedFeedback.assignment?.max_score || 100}</span>
                                </div>
                            </div>
                            <div className="prose prose-sm max-w-none">
                                <p className="text-foreground whitespace-pre-wrap leading-relaxed">{selectedFeedback.feedback || 'No feedback provided yet.'}</p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-border flex justify-end flex-shrink-0">
                            <Button onClick={closeFeedbackModal}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {showEditModal && editingSubmission && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm ${isClosingModal ? 'modal-backdrop-exit' : 'modal-backdrop-enter'}`}>
                    <div className={`bg-background rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isClosingModal ? 'modal-content-exit' : 'modal-content-enter'}`}>
                        <div className="p-6 border-b border-border flex justify-between items-start bg-muted/50 flex-shrink-0">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2"><Edit2 className="w-5 h-5" />Edit Submission</h3>
                                <p className="text-sm text-muted-foreground mt-1">{editingSubmission.assignment?.title || 'Assignment'}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={closeEditModal} className="rounded-full"><X className="w-5 h-5" /></Button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1" style={{ overscrollBehavior: 'contain' }}>
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center gap-2 p-3 bg-muted rounded-lg border border-border">
                                    <div className="flex items-center gap-1 border-r border-border pr-2">
                                        <Button type="button" variant="ghost" size="sm" onClick={() => applyFormattingEdit('bold')} className="h-8 w-8 p-0"><Bold className="h-4 w-4" /></Button>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => applyFormattingEdit('italic')} className="h-8 w-8 p-0"><Italic className="h-4 w-4" /></Button>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => applyFormattingEdit('underline')} className="h-8 w-8 p-0"><Underline className="h-4 w-4" /></Button>
                                    </div>
                                    <div className="flex items-center gap-1 border-r border-border pr-2">
                                        <Button type="button" variant="ghost" size="sm" onClick={() => applyFormattingEdit('justifyLeft')} className="h-8 w-8 p-0"><AlignLeft className="h-4 w-4" /></Button>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => applyFormattingEdit('justifyCenter')} className="h-8 w-8 p-0"><AlignCenter className="h-4 w-4" /></Button>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => applyFormattingEdit('justifyRight')} className="h-8 w-8 p-0"><AlignRight className="h-4 w-4" /></Button>
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={insertParagraphEdit} className="text-xs h-8">¶ Paragraph</Button>
                                </div>
                                <div ref={editorRefEdit} contentEditable={true} onInput={handleEditorEditInput} onPaste={handlePaste} className="rich-text-editor" data-placeholder="Update your answer..." />

                                {/* File attachment */}
                                <div className="space-y-2">
                                    <input
                                        ref={editFileInputRef}
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => {
                                            pickFile(e.target.files, setEditFile);
                                            e.target.value = '';
                                        }}
                                    />

                                    {editingSubmission.file_url && !editFile && (
                                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                                                <span className="truncate">
                                                    Current file ({getStoredFileExtension(editingSubmission.file_url).toUpperCase()})
                                                </span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="gap-2 shrink-0"
                                                onClick={() => handleDownloadFile(editingSubmission)}
                                                disabled={downloadingId === editingSubmission.id}
                                            >
                                                {downloadingId === editingSubmission.id
                                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                                    : <Download className="w-4 h-4" />}
                                                Download
                                            </Button>
                                        </div>
                                    )}

                                    {editFile ? (
                                        <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border p-3 text-sm">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileText className="w-4 h-4 shrink-0 text-primary" />
                                                <span className="truncate">{editFile.name}</span>
                                                <span className="text-xs text-muted-foreground shrink-0">
                                                    {formatFileSize(editFile.size)}{editingSubmission.file_url ? ' · replaces current file' : ''}
                                                </span>
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setEditFile(null)} disabled={updating} aria-label="Remove file">
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button type="button" variant="outline" className="gap-2" onClick={() => editFileInputRef.current?.click()} disabled={updating}>
                                            <Paperclip className="w-4 h-4" /> {editingSubmission.file_url ? 'Replace file' : 'Attach a file'}
                                        </Button>
                                    )}
                                    <p className="text-xs text-muted-foreground">Up to 50 MB.</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/50 flex-shrink-0">
                            <Button variant="outline" onClick={closeEditModal} disabled={updating}>Cancel</Button>
                            <Button onClick={handleEditSubmit} disabled={updating} className="gap-2">
                                {updating ? <><Loader2 className="w-4 h-4 animate-spin" />Updating...</> : <><Send className="w-4 h-4" />Update Submission</>}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default StudentAssignments;