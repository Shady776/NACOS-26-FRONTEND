import { useState, useEffect, useRef, useCallback } from "react";
import { Timer, FileQuestion, CheckCircle2, AlertCircle, ChevronRight, PlayCircle, XCircle, Eye, AlertTriangle, Send, X, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BASE_URL } from "@/components/api/api";


// The login cookie is sent automatically (see lib/auth.ts), so only the content type is needed.
const getAuthHeaders = () => ({ 'Content-Type': 'application/json' });

// ── Typed answers are kept on this device while the student works ───────────
// Keyed by attempt id; removed once the test is submitted.
const answersKey = (attemptId: string) => `test_answers:${attemptId}`;

const loadLocalAnswers = (attemptId: string): Record<string, string> => {
    try {
        return JSON.parse(localStorage.getItem(answersKey(attemptId)) || '{}');
    } catch {
        return {};
    }
};

const saveLocalAnswers = (attemptId: string, answers: Record<string, string>) => {
    try {
        localStorage.setItem(answersKey(attemptId), JSON.stringify(answers));
    } catch { /* storage full or blocked: the server copy still works */ }
};

const clearLocalAnswers = (attemptId: string) => {
    try {
        localStorage.removeItem(answersKey(attemptId));
    } catch { /* nothing to clean */ }
};

// Countdown Timer Component
const CountdownTimer = ({ durationSeconds, onTimeExpire }) => {
    const [timeRemaining, setTimeRemaining] = useState(durationSeconds);
    const hasExpiredRef = useRef(false);

    useEffect(() => {
        if (hasExpiredRef.current) return;
        setTimeRemaining(durationSeconds);
    }, [durationSeconds]);

    useEffect(() => {
        if (timeRemaining <= 0) {
            if (!hasExpiredRef.current) {
                hasExpiredRef.current = true;
                onTimeExpire();
            }
            return;
        }

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (!hasExpiredRef.current) {
                        hasExpiredRef.current = true;
                        onTimeExpire();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeRemaining, onTimeExpire]);

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    const isWarning = timeRemaining < 300;
    const isCritical = timeRemaining < 60;

    return (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-medium ${isCritical ? 'bg-red-100 text-red-700 animate-pulse' :
                isWarning ? 'bg-orange-100 text-orange-700' :
                'bg-primary/10 text-primary'
            }`}>
            <Timer className="w-4 h-4" />
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
    );
};

// Start Test Modal
const StartTestModal = ({ isOpen, onClose, onConfirm, test }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border border-border">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                        <PlayCircle className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-card-foreground">Start Test</h3>
                </div>

                <div className="mb-6">
                    <p className="text-muted-foreground mb-4">
                        You are about to start "<span className="font-medium text-card-foreground">{test?.title}</span>"
                    </p>

                    <div className="bg-secondary rounded-lg p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="font-medium text-card-foreground">{test?.duration_minutes} minutes</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Marks:</span>
                            <span className="font-medium text-card-foreground">{test?.total_marks}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Questions:</span>
                            <span className="font-medium text-card-foreground">{test?.question_count}</span>
                        </div>
                    </div>

                    <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                        <p className="text-sm text-yellow-600 dark:text-yellow-500">
                            <strong>Important:</strong> Once you start, the timer will begin. Do not switch tabs or refresh the page.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={onConfirm} className="bg-primary hover:bg-primary/90">
                        Start Test
                    </Button>
                </div>
            </div>
        </div>
    );
};

// Submit Test Modal
const SubmitTestModal = ({ isOpen, onClose, onConfirm, answeredCount, totalCount }) => {
    if (!isOpen) return null;

    const unanswered = totalCount - answeredCount;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border border-border">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-green-500/10 p-3 rounded-full">
                        <Send className="w-6 h-6 text-green-600 dark:text-green-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-card-foreground">Submit Test</h3>
                </div>

                <div className="mb-6">
                    <p className="text-muted-foreground mb-4">
                        Are you sure you want to submit your test?
                    </p>

                    <div className="bg-secondary rounded-lg p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Answered:</span>
                            <span className="font-medium text-green-600 dark:text-green-500">{answeredCount} / {totalCount}</span>
                        </div>
                        {unanswered > 0 && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Unanswered:</span>
                                <span className="font-medium text-orange-600 dark:text-orange-500">{unanswered}</span>
                            </div>
                        )}
                    </div>

                    {unanswered > 0 && (
                        <div className="mt-4 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                            <p className="text-sm text-orange-600 dark:text-orange-500">
                                <strong>Warning:</strong> You have {unanswered} unanswered question{unanswered > 1 ? 's' : ''}. They will be marked as incorrect.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={onConfirm} className="bg-green-600 hover:bg-green-700">
                        Submit Test
                    </Button>
                </div>
            </div>
        </div>
    );
};

// Question Card Component
const QuestionCard = ({ question, index, answer, onAnswerChange, disabled }) => {
    return (
        <Card className="mb-6">
            <CardContent className="p-6">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                            <Badge variant="outline" className="text-xs">
                                {question.question_type === 'multiple_choice' ? 'Multiple Choice' :
                                    question.question_type === 'fill_in_blank' ? 'Fill in Blank' :
                                        'Theory'}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                                {question.marks} marks
                            </Badge>
                        </div>

                        <p className="text-lg mb-4">{question.question_text}</p>

                        {/* Multiple Choice */}
                        {question.question_type === 'multiple_choice' && question.options && (
                            <div className="space-y-3">
                                {question.options.map((option, i) => (
                                    <div
                                        key={i}
                                        onClick={() => !disabled && onAnswerChange(option)}
                                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${answer === option
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:bg-secondary/50'
                                            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${answer === option
                                                    ? 'border-primary bg-primary'
                                                    : 'border-muted-foreground'
                                                }`}>
                                                {answer === option && <div className="w-2 h-2 bg-primary-foreground rounded-full" />}
                                            </div>
                                            <span className={answer === option ? 'font-medium' : ''}>
                                                <span className="font-semibold">{String.fromCharCode(65 + i)}.</span> {option}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Fill in the Blank */}
{question.question_type === 'fill_in_blank' && (
    <input
        type="text"
        value={answer}
        disabled={disabled}
        onChange={(e) => onAnswerChange(e.target.value)}
        className="w-full border-2 border-border rounded-lg px-4 py-3 bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        placeholder="Type your answer here..."
    />
)}

{/* Theory */}
{question.question_type === 'theory' && (
    <div>
        <textarea
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            rows={6}
            disabled={disabled}
            className="w-full border-2 border-border rounded-lg px-4 py-3 bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Write your answer here..."
        />
        <p className="mt-2 text-sm text-muted-foreground flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Theory questions will be graded manually by your instructor.
        </p>
    </div>
)}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// Take Test View
const TakeTestView = ({ test, onBack, onTestComplete }) => {
    const hasStarted = useRef(false);
    const [attemptData, setAttemptData] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);
    const answersRef = useRef<Record<string, string>>({});          // latest answers, for the timer-based save
    const lastSyncedRef = useRef('');                               // what the server already has
    const finishedRef = useRef(false);                              // true once submitted: stop saving
    const submitMaybeSentRef = useRef(false);                       // a submit was sent but we never saw the reply
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [timeExpired, setTimeExpired] = useState(false);
    const [testInvalidated, setTestInvalidated] = useState(false);
    const [error, setError] = useState(null);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [showTabWarning, setShowTabWarning] = useState(false);

    // Prevent page leave
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (!testInvalidated && !submitting && attemptData) {
                e.preventDefault();
                e.returnValue = 'You have an ongoing test. Leaving will invalidate your attempt!';
                return e.returnValue;
            }
        };

        const handlePopState = (e) => {
            if (!testInvalidated && attemptData) {
                window.history.pushState(null, '', window.location.href);
                toast.error('You cannot leave during an active test!');
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden && attemptData && !testInvalidated && !timeExpired) {
                const newCount = tabSwitchCount + 1;
                setTabSwitchCount(newCount);

                if (newCount >= 3) {
                    handleInvalidateTest('Too many tab switches detected');
                } else {
                    setShowTabWarning(true);
                    toast.error(`Warning: Tab switch detected! (${newCount}/3)`);
                    setTimeout(() => setShowTabWarning(false), 5000);
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('popstate', handlePopState);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.history.pushState(null, '', window.location.href);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [attemptData, testInvalidated, submitting, tabSwitchCount, timeExpired]);

    const handleInvalidateTest = async (reason) => {
        setTestInvalidated(true);
        toast.error(`Test invalidated: ${reason}`);

        try {
            // answersRef always holds the latest typing, even when called from the timer
            const answersArray = Object.entries(answersRef.current).map(([questionId, answerText]) => ({
                question_id: questionId,
                answer_text: answerText || ''
            }));

            await fetch(`${BASE_URL}/tests/${test.id}/submit`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    answers: answersArray,
                    invalidated: true,
                    invalidation_reason: reason
                })
            });
        } catch (err) {
            console.error('Failed to submit invalidated test:', err);
        }

        finishedRef.current = true;
        if (attemptData) clearLocalAnswers(attemptData.id);

        setTimeout(() => {
            onTestComplete();
            onBack();
        }, 3000);
    };

    const startTest = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${BASE_URL}/tests/${test.id}/start`, {
                method: 'POST',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to start test');
            }

            const data = await response.json();
            setAttemptData(data);
            setQuestions(data.questions || []);

            // Restore what the student had typed before a refresh or crash:
            // the copy on this device (newest keystrokes) wins over the server copy.
            const initialAnswers: Record<string, string> = {};
            const serverSaved: Record<string, string> = data.saved_answers || {};
            const localSaved = loadLocalAnswers(data.id);
            (data.questions || []).forEach(q => {
                initialAnswers[q.id] = localSaved[q.id] || serverSaved[q.id] || '';
            });
            setAnswers(initialAnswers);
            lastSyncedRef.current = JSON.stringify(serverSaved);

            setError(null);
        } catch (err) {
            toast.error(err.message);
            setError(err.message);
            setTimeout(() => onBack(), 2000);
        } finally {
            setLoading(false);
        }
    };

    // autoFlag is true when the timer ran out and the page submits for the student.
    const handleSubmitTest = async (autoFlag?: unknown) => {
        const auto = autoFlag === true;
        if (!auto && (timeExpired || testInvalidated)) {
            toast.error('Cannot submit: Test is no longer valid.');
            return;
        }
        if (testInvalidated) return;

        const finish = () => {
            finishedRef.current = true;
            if (attemptData) clearLocalAnswers(attemptData.id);
            onTestComplete();
            onBack();
        };

        try {
            setSubmitting(true);
            setSubmitError(null);

            const answersArray = Object.entries(answers).map(([questionId, answerText]) => ({
                question_id: questionId,
                answer_text: answerText || ''
            }));

            const response = await fetch(`${BASE_URL}/tests/${test.id}/submit`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ answers: answersArray })
            });

            if (!response.ok) {
                // The first try may have reached the server even though we never saw the
                // reply. If there is no active attempt left, it was already submitted.
                // (After time runs out the server may also have submitted it for us.)
                if ((submitMaybeSentRef.current || auto) && response.status === 404) {
                    toast.success(auto ? 'Time is up. Your answers were submitted.' : 'Your test was already submitted.');
                    finish();
                    return;
                }
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to submit test');
            }

            toast.success(auto ? 'Time is up. Your answers were submitted automatically.' : 'Test submitted successfully!');
            finish();
        } catch (err) {
            if (err instanceof TypeError) {
                // fetch() throws a TypeError when the network is down
                submitMaybeSentRef.current = true;
                setSubmitError('Could not reach the server. Your answers are saved on this device. Check your connection, then tap Retry.');
                toast.error('Connection problem. Your answers are safe. Tap Retry when you are back online.');
            } else {
                toast.error(err.message || 'Failed to submit test');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // The timer calls this once at 00:00: lock the answers and submit them automatically.
    const submitRef = useRef(handleSubmitTest);
    submitRef.current = handleSubmitTest;

    const handleTimeExpire = useCallback(() => {
        if (finishedRef.current || testInvalidated) return;
        setTimeExpired(true);
        toast.info('Time is up! Submitting your answers...');
        submitRef.current(true);
    }, [testInvalidated]);

    // If the automatic submit failed because the connection dropped, keep trying
    // every 10 seconds until it goes through (the answers are safe on this device).
    useEffect(() => {
        if (!timeExpired || !submitError || submitting || finishedRef.current) return;
        const id = setTimeout(() => submitRef.current(true), 10000);
        return () => clearTimeout(id);
    }, [timeExpired, submitError, submitting]);

    useEffect(() => {
        if (!hasStarted.current) {
            hasStarted.current = true;
            startTest();
        }
    }, [test.id]);

    // Keep a copy of the typed answers on this device after every change
    useEffect(() => {
        answersRef.current = answers;
        if (attemptData && !finishedRef.current) {
            saveLocalAnswers(attemptData.id, answers);
        }
    }, [answers, attemptData]);

    // Save answers to the server every 15 seconds (only when something changed)
    const syncAnswers = useCallback(async () => {
        if (!attemptData || finishedRef.current) return;
        const current = answersRef.current;
        const payload = JSON.stringify(current);
        if (payload === lastSyncedRef.current) return;
        try {
            const res = await fetch(`${BASE_URL}/tests/${test.id}/answers`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ answers: current })
            });
            if (res.ok) lastSyncedRef.current = payload;
        } catch {
            // Offline: the copy on this device is safe, the next tick tries again
        }
    }, [attemptData, test.id]);

    useEffect(() => {
        if (!attemptData) return;
        const id = setInterval(syncAnswers, 15000);
        return () => clearInterval(id);
    }, [attemptData, syncAnswers]);

    // Show a clear message when the connection drops, and sync as soon as it returns
    useEffect(() => {
        const goOnline = () => {
            setIsOffline(false);
            syncAnswers();
        };
        const goOffline = () => setIsOffline(true);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, [syncAnswers]);

    if (loading) {
        return (
            <DashboardLayout role="student" pausePolling>
                <div className="flex flex-col items-center justify-center h-[80vh]">
                    <Loader2 className="animate-spin text-primary mb-4" size={48} />
                    <p className="text-muted-foreground">Starting test...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout role="student" pausePolling>
                <div className="flex flex-col items-center justify-center h-[80vh]">
                    <AlertCircle className="text-destructive mb-4" size={48} />
                    <p className="text-destructive text-lg font-semibold mb-2">Error Starting Test</p>
                    <p className="text-muted-foreground max-w-md text-center">{error}</p>
                </div>
            </DashboardLayout>
        );
    }

    if (testInvalidated) {
        return (
            <DashboardLayout role="student" pausePolling>
                <div className="flex flex-col items-center justify-center h-[80vh]">
                    <XCircle className="text-destructive mb-4" size={64} />
                    <h2 className="text-2xl font-bold text-destructive mb-2">Test Invalidated</h2>
                    <p className="text-muted-foreground text-center max-w-md mb-4">
                        Your test has been invalidated due to a policy violation.
                    </p>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="animate-spin w-4 h-4" />
                        <span>Redirecting...</span>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const answeredCount = Object.values(answers).filter(a => a && a.trim()).length;
    const initialSeconds: number = attemptData
        ? (attemptData.time_remaining_seconds ?? attemptData.time_remaining_minutes * 60)
        : 0;

    return (
        <DashboardLayout role="student" pausePolling>
            {/* Tab Warning */}
            {showTabWarning && (
                <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-3 px-4 z-[60] animate-pulse">
                    <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">
                            Warning: Tab switch detected! ({tabSwitchCount}/3) - Do not leave this page!
                        </span>
                    </div>
                </div>
            )}

            <div className="max-w-4xl mx-auto space-y-6">
                {/* Connection problems */}
                {isOffline && (
                    <Card className="bg-orange-50 border-orange-200">
                        <CardContent className="p-4">
                            <p className="text-orange-800 font-semibold flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" />
                                You are offline. Keep going: your answers are saved on this device and will be sent when the connection returns.
                            </p>
                        </CardContent>
                    </Card>
                )}
                {submitError && (
                    <Card className="bg-red-50 border-red-200">
                        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <p className="text-red-800 font-medium flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                {submitError}
                            </p>
                            <Button size="sm" onClick={() => handleSubmitTest(timeExpired)} disabled={submitting} className="bg-red-600 hover:bg-red-700">
                                Retry submit
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-display font-bold">{test.title}</h1>
                        <p className="text-muted-foreground">
                            Question {answeredCount} of {questions.length} answered
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {initialSeconds <= 0 && !timeExpired && (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 text-red-700 font-medium text-sm">
                                <XCircle className="w-4 h-4" />
                                No timer: invalid test duration
                            </div>
                        )}
                        {initialSeconds > 0 && !timeExpired && (
                            <CountdownTimer
                                durationSeconds={initialSeconds}
                                onTimeExpire={handleTimeExpire}
                            />
                        )}
                        {timeExpired && (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 text-red-700 font-mono font-medium">
                                <XCircle className="w-4 h-4" />
                                00:00
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Progress</span>
                    <Progress value={(answeredCount / questions.length) * 100} className="flex-1 h-2" />
                    <span>{Math.round((answeredCount / questions.length) * 100)}%</span>
                </div>

                {/* Time Expired Warning */}
                {timeExpired && (
                    <Card className="bg-red-50 border-red-200">
                        <CardContent className="p-4">
                            <p className="text-red-800 font-semibold flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" />
                                {submitError ? 'Time is up. Your answers are saved and will be submitted as soon as the connection returns.' : 'Time is up! Submitting your answers...'}
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Rules Reminder */}
                <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-yellow-800">
                                <p className="font-medium mb-1">Test Rules:</p>
                                <ul className="list-disc list-inside space-y-0.5">
                                    <li>Do not switch tabs or leave this page</li>
                                    <li>Do not refresh the browser</li>
                                    <li>Your answers are submitted automatically when the timer reaches zero</li>
                                    <li>3 tab switches will invalidate your test</li>
                                </ul>
                                {tabSwitchCount > 0 && (
                                    <p className="mt-2 font-semibold text-orange-700">
                                        Tab switches: {tabSwitchCount}/3
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Questions */}
                {questions.map((question, index) => (
                    <QuestionCard
                        key={question.id}
                        question={question}
                        index={index}
                        answer={answers[question.id] || ''}
                        onAnswerChange={(value) => setAnswers(prev => ({ ...prev, [question.id]: value }))}
                        disabled={timeExpired || testInvalidated}
                    />
                ))}

                {/* Submit Button */}
                <div className="flex justify-end pt-4">
                    <Button
                        size="lg"
                        onClick={() => !timeExpired && !testInvalidated && setShowSubmitModal(true)}
                        disabled={submitting || timeExpired || testInvalidated}
                        className={`gap-2 ${timeExpired || testInvalidated ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                            }`}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                {timeExpired ? 'Closed' : 'Submit Test'}
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <SubmitTestModal
                isOpen={showSubmitModal}
                onClose={() => setShowSubmitModal(false)}
                onConfirm={() => {
                    setShowSubmitModal(false);
                    handleSubmitTest();
                }}
                answeredCount={answeredCount}
                totalCount={questions.length}
            />
        </DashboardLayout>
    );
};

// Test Results View
const TestResultsView = ({ test, onBack }) => {
    const [attemptDetail, setAttemptDetail] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAttemptDetail = async () => {
            try {
                setLoading(true);

                const attemptsResponse = await fetch(
                    `${BASE_URL}/tests/my-attempts/course/${test.course_id}`,
                    { headers: getAuthHeaders() }
                );

                if (!attemptsResponse.ok) throw new Error('Failed to fetch attempts');

                const attempts = await attemptsResponse.json();
                const myAttempt = attempts.find(a => a.test_id === test.id);

                if (!myAttempt) {
                    throw new Error('Attempt not found');
                }

                const detailResponse = await fetch(
                    `${BASE_URL}/tests/attempt/${myAttempt.id}`,
                    { headers: getAuthHeaders() }
                );

                if (!detailResponse.ok) throw new Error('Failed to fetch attempt details');

                const data = await detailResponse.json();
                setAttemptDetail(data);
            } catch (err) {
                toast.error(err.message);
                onBack();
            } finally {
                setLoading(false);
            }
        };

        fetchAttemptDetail();
    }, [test.id, test.course_id, onBack]);

    if (loading) {
        return (
            <DashboardLayout role="student">
                <div className="flex items-center justify-center h-[80vh]">
                    <Loader2 className="animate-spin text-primary" size={48} />
                </div>
            </DashboardLayout>
        );
    }

    if (!attemptDetail) {
        return null;
    }

    const isPending = attemptDetail.status === 'submitted';
    const isGraded = attemptDetail.status === 'graded';
    const isInvalidated = attemptDetail.status === 'invalidated';

    return (
        <DashboardLayout role="student">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold">{test.title}</h1>
                        <p className="text-muted-foreground">Test Results</p>
                    </div>
                    <Button variant="outline" onClick={onBack}>
                        <X className="w-4 h-4 mr-2" />
                        Close
                    </Button>
                </div>

                {/* Score Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className={isInvalidated ? 'bg-red-50 border-red-200' : isGraded ? 'bg-primary/5 border-primary/20' : 'bg-yellow-50 border-yellow-200'}>
                        <CardContent className="p-6">
                            <p className={`text-sm font-medium mb-2 ${isInvalidated ? 'text-red-600' : isGraded ? 'text-green-600' : 'text-yellow-600'
                                }`}>
                                Status
                            </p>
                            <p className={`text-2xl font-bold ${isInvalidated ? 'text-red-900' : isGraded ? 'text-white-600' : 'text-yellow-900'
                                }`}>
                                {isInvalidated ? 'Invalidated' : isPending ? 'Pending' : 'Graded'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-6">
                            <p className="text-sm font-medium text-primary mb-2">Your Score</p>
                            <p className="text-2xl font-bold">
                                {isGraded && attemptDetail.score !== null
                                    ? `${attemptDetail.score}/${attemptDetail.total_marks}`
                                    : 'Pending'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-6">
                            <p className="text-sm font-medium text-primary mb-2">Time Taken</p>
                            <p className="text-2xl font-bold">
                                {attemptDetail.time_taken_minutes || 0} mins
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-6">
                            <p className="text-sm font-medium text-primary mb-2">Submitted</p>
                            <p className="text-lg font-bold">
                                {attemptDetail.submitted_at
                                    ? new Date(attemptDetail.submitted_at).toLocaleDateString()
                                    : '-'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Status Messages */}
                {isPending && (
                    <Card className="bg-yellow-50 border-yellow-200">
                        <CardContent className="p-4">
<div className="flex items-start gap-3">
<AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
<div>
<p className="text-sm font-medium text-yellow-800">Grading in Progress</p>
<p className="text-sm text-yellow-700 mt-1">
Your test contains theory questions that require manual grading.
</p>
</div>
</div>
</CardContent>
</Card>
)}
{isInvalidated && (
                <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-red-800 mb-1">Test Invalidated</p>
                                <p className="text-sm text-red-700">
                                    {attemptDetail.invalidation_reason || 'This test was invalidated due to a policy violation.'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Answers Review */}
            <Card>
                <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-6">Answer Review</h2>

                    <div className="space-y-6">
                        {attemptDetail.answers && attemptDetail.answers.length > 0 ? (
                            attemptDetail.answers.map((answerData, index) => {
                                const question = answerData.question;

                                if (!question) {
                                    return (
                                        <Card key={answerData.id || index} className="bg-yellow-50 border-yellow-200">
                                            <CardContent className="p-4">
                                                <p className="text-yellow-800">Question data not available</p>
                                            </CardContent>
                                        </Card>
                                    );
                                }

                               return (
    <Card key={answerData.id} className="border-2">
        <CardContent className="p-6">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                                {question.question_type === 'multiple_choice' ? 'MCQ' :
                                    question.question_type === 'fill_in_blank' ? 'Fill in Blank' :
                                        'Theory'}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                                {question.marks} marks
                            </Badge>
                        </div>

                        {answerData.is_correct !== null && (
                            <div className={`flex items-center gap-1 ${answerData.is_correct ? 'text-green-400' : 'text-red-400'
                                }`}>
                                {answerData.is_correct ? (
                                    <>
                                        <CheckCircle2 className="w-5 h-5" />
                                        <span className="text-sm font-medium">+{answerData.marks_obtained}</span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="w-5 h-5" />
                                        <span className="text-sm font-medium">0</span>
                                    </>
                                )}
                            </div>
                        )}

                        {answerData.is_correct === null && isGraded && (
                            <div className="flex items-center gap-1 text-primary">
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="text-sm font-medium">+{answerData.marks_obtained || 0}</span>
                            </div>
                        )}
                    </div>

                    <p className="mb-4 text-white">{question.question_text}</p>

                    {/* Your Answer */}
                    <div className="mb-3">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Your Answer:</p>
                        <div className={`p-3 rounded-lg border-2 bg-black ${
                            answerData.is_correct === true 
                                ? 'border-green-500' :
                            answerData.is_correct === false 
                                ? 'border-red-500' :
                                'border-gray-600'
                        }`}>
                            <p className={`text-white ${!answerData.answer_text ? 'italic opacity-70' : ''}`}>
                                {answerData.answer_text || '(No answer provided)'}
                            </p>
                        </div>
                    </div>

                    {/* Correct Answer */}
                    {question.question_type !== 'theory' && isGraded && !answerData.is_correct && question.correct_answer && (
                        <div className="mb-3">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Correct Answer:</p>
                            <div className="p-3 bg-black border-2 border-green-500 rounded-lg">
                                <p className="text-white">{question.correct_answer}</p>
                            </div>
                        </div>
                    )}

                    {/* Teacher Feedback */}
                    {answerData.teacher_feedback && (
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Teacher Feedback:</p>
                            <div className="p-3 bg-black border-2 border-blue-500 rounded-lg">
                                <p className="text-white">{answerData.teacher_feedback}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </CardContent>
    </Card>
);
})
) : (
    <div className="text-center py-8 text-muted-foreground">
        <FileQuestion className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No answers recorded for this attempt</p>
    </div>
)}
</div>
</CardContent>
</Card>
</div>
</DashboardLayout>
);
};

// Test Start Button Component
const TestStartButton = ({ test, onStart, resume = false }) => {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <Button
                size="lg"
                onClick={() => setShowModal(true)}
                className="gap-2 bg-green-600 hover:bg-green-700"
            >
                <PlayCircle className="w-4 h-4" />
                {resume ? 'Resume Test' : 'Start Test'}
            </Button>
            <StartTestModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onConfirm={() => {
                    setShowModal(false);
                    onStart(test);
                }}
                test={test}
            />
        </>
    );
};
// Main Component
const StudentTest = () => {
const [activeView, setActiveView] = useState('list'); // 'list', 'take-test', 'results'
const [courses, setCourses] = useState([]);
const [selectedCourse, setSelectedCourse] = useState(null);
const [tests, setTests] = useState([]);
const [myAttempts, setMyAttempts] = useState([]);
const [selectedTest, setSelectedTest] = useState(null);
const [loading, setLoading] = useState(false);

const fetchEnrolledCourses = async () => {
    try {
        setLoading(true);
        const response = await fetch(`${BASE_URL}/enrollments/my-courses`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Failed to fetch courses');

        const data = await response.json();
        setCourses(data.map(enrollment => enrollment.course));
    } catch (err) {
        toast.error(err.message);
    } finally {
        setLoading(false);
    }
};

const fetchCourseTests = async (courseId) => {
    try {
        setLoading(true);
        const response = await fetch(`${BASE_URL}/tests/course/${courseId}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Failed to fetch tests');

        const data = await response.json();
        setTests(data.filter(test => test.status === 'active'));
    } catch (err) {
        toast.error(err.message);
    } finally {
        setLoading(false);
    }
};

const fetchMyAttempts = async (courseId) => {
    try {
        const response = await fetch(`${BASE_URL}/tests/my-attempts/course/${courseId}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Failed to fetch attempts');

        const data = await response.json();
        setMyAttempts(data);
    } catch (err) {
        console.error('Error fetching attempts:', err);
    }
};

useEffect(() => {
    fetchEnrolledCourses();
}, []);

useEffect(() => {
    if (selectedCourse) {
        fetchCourseTests(selectedCourse);
        fetchMyAttempts(selectedCourse);
    }
}, [selectedCourse]);

const handleStartTest = (test) => {
    setSelectedTest(test);
    setActiveView('take-test');
};

const handleViewResults = (test) => {
    setSelectedTest(test);
    setActiveView('results');
};

const handleTestComplete = () => {
    if (selectedCourse) {
        fetchMyAttempts(selectedCourse);
    }
};

if (activeView === 'take-test' && selectedTest) {
    return (
        <TakeTestView
            test={selectedTest}
            onBack={() => setActiveView('list')}
            onTestComplete={handleTestComplete}
        />
    );
}

if (activeView === 'results' && selectedTest) {
    return (
        <TestResultsView
            test={selectedTest}
            onBack={() => setActiveView('list')}
        />
    );
}

const getAttemptForTest = (testId) => {
    return myAttempts.find(attempt => attempt.test_id === testId);
};

const sortedTests = [...tests].sort((a, b) => {
    const aAttempt = getAttemptForTest(a.id);
    const bAttempt = getAttemptForTest(b.id);
    const aDone = !!aAttempt && aAttempt.status !== 'in_progress';
    const bDone = !!bAttempt && bAttempt.status !== 'in_progress';

    if (aDone !== bDone) return aDone ? 1 : -1;   // finished ones go to the bottom
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // newest first
});

return (
    <DashboardLayout role="student">
        <div className="max-w-5xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-display font-bold">Tests & Quizzes</h1>
                <p className="text-muted-foreground">View and take your scheduled assessments</p>
            </div>

            {/* Course Selection */}
            <Card>
    <CardContent className="p-6">
        <label className="block text-sm font-medium mb-2">
            Select Course
        </label>
        <Select value={selectedCourse || ''} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-full">
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

            {selectedCourse && (
                <Tabs defaultValue="available" className="w-full">
                    <TabsList className="grid w-full md:w-[400px] grid-cols-2 mb-8">
                        <TabsTrigger value="available">Available Tests</TabsTrigger>
                        <TabsTrigger value="history">My Results</TabsTrigger>
                    </TabsList>

                    <TabsContent value="available" className="space-y-4">
                        {loading ? (
                            <Card>
                                <CardContent className="p-16 text-center">
                                    <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
                                    <p className="text-muted-foreground">Loading tests...</p>
                                </CardContent>
                            </Card>
                        ) : tests.length === 0 ? (
                            <Card>
                                <CardContent className="p-16 text-center">
                                    <FileQuestion className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                                    <h3 className="text-lg font-semibold mb-2">No active tests available</h3>
                                    <p className="text-muted-foreground">Check back later for new tests</p>
                                </CardContent>
                            </Card>
                        ) : (
                            sortedTests.map((test) => {
                                const attempt = getAttemptForTest(test.id);
                                // An attempt that is still in progress (e.g. after a refresh or a
                                // dropped connection) can be resumed, not just viewed.
                                const canResume = !!attempt && attempt.status === 'in_progress';
                                const hasAttempted = !!attempt && !canResume;
                                const isExpired = test.end_time && new Date(test.end_time) < new Date();
                                const notStarted = test.start_time && new Date(test.start_time) > new Date();

                                return (
                                    <Card key={test.id} className="group hover:border-primary/50 transition-colors">
                                        <CardContent className="p-6">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={hasAttempted ? "secondary" : "default"}>
                                                            {hasAttempted ? "Completed" : canResume ? "In progress" : "Available"}
                                                        </Badge>
                                                        <Badge variant="outline">{test.test_type}</Badge>
                                                    </div>
                                                    <h3 className="text-xl font-semibold">{test.title}</h3>
                                                    {test.description && (
                                                        <p className="text-muted-foreground text-sm">{test.description}</p>
                                                    )}
                                                    <div className="flex items-center gap-6 text-sm text-muted-foreground pt-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <Timer className="w-4 h-4" />
                                                            {test.duration_minutes} mins
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <FileQuestion className="w-4 h-4" />
                                                            {test.question_count} Questions
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    {test.start_time && (
                                                        <div className="text-sm mb-4">
                                                            <span className="text-muted-foreground">Available: </span>
                                                            <span className="font-medium">
                                                                {new Date(test.start_time).toLocaleString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {hasAttempted ? (
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => handleViewResults(test)}
                                                            className="gap-2"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            View Results
                                                        </Button>
                                                    ) : canResume ? (
                                                        <TestStartButton test={test} onStart={handleStartTest} resume />
                                                    ) : isExpired ? (
                                                        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg border border-red-200 font-medium">
                                                            <XCircle className="w-4 h-4" />
                                                            Expired
                                                        </div>
                                                    ) : notStarted ? (
                                                        <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-lg border border-orange-200 font-medium">
                                                            <AlertTriangle className="w-4 h-4" />
                                                            Not Started
                                                        </div>
                                                    ) : (
                                                        <TestStartButton test={test} onStart={handleStartTest} />
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </TabsContent>

                    <TabsContent value="history" className="space-y-4">
                        {myAttempts.length === 0 ? (
                            <Card>
                                <CardContent className="p-16 text-center">
                                    <CheckCircle2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                                    <h3 className="text-lg font-semibold mb-2">No test attempts yet</h3>
                                    <p className="text-muted-foreground">Your completed tests will appear here</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-secondary/50">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                        Test Name
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                        Score
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                        Submitted
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                        Action
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {[...myAttempts]
                                                    .sort((a, b) =>
                                                        new Date(b.submitted_at || b.started_at || 0).getTime() -
                                                        new Date(a.submitted_at || a.started_at || 0).getTime())
                                                    .map((attempt) => {
                                                    const test = tests.find(t => t.id === attempt.test_id);
                                                    return (
                                                        <tr key={attempt.id} className="hover:bg-secondary/30 transition-colors">
                                                            <td className="px-6 py-4 text-sm font-medium">
                                                                {test?.title || 'Unknown Test'}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <Badge variant={
                                                                    attempt.status === 'graded' ? 'default' :
                                                                        attempt.status === 'submitted' ? 'secondary' :
                                                                            attempt.status === 'invalidated' ? 'destructive' :
                                                                                'outline'
                                                                } className="capitalize">
                                                                    {attempt.status === 'graded' ? 'Graded' :
                                                                        attempt.status === 'submitted' ? 'Pending' :
                                                                            attempt.status === 'invalidated' ? 'Invalidated' :
                                                                                attempt.status}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm font-semibold">
                                                                {attempt.status === 'graded' && attempt.score !== null
                                                                    ? `${attempt.score}/${attempt.total_marks}`
                                                                    : '-'}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-muted-foreground">
                                                                {attempt.submitted_at
                                                                    ? new Date(attempt.submitted_at).toLocaleString('en-US', {
                                                                        year: 'numeric',
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })
                                                                    : '-'}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {attempt.status === 'graded' && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleViewResults(test)}
                                                                        className="gap-2"
                                                                    >
                                                                        <Eye className="w-4 h-4" />
                                                                        View Details
                                                                    </Button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            )}
        </div>
    </DashboardLayout>
);
};
export default StudentTest;