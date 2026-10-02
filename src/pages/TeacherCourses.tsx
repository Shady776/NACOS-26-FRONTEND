import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, Users, BookOpen, MoreVertical, Edit, Trash2, Loader2, Upload, FileText, X } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
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

// Must match the backend rules in course_materials.py
const MATERIAL_EXTENSIONS = ["pdf", "doc", "docx", "ppt", "pptx", "txt", "zip", "rar"];
const MAX_MATERIAL_SIZE = 50 * 1024 * 1024; // 50 MB

interface Course {
    id: string;
    title: string;
    course_code: string;
    description?: string;
    department: string;
    semester: string;
    schedule?: string;
    location?: string;
    credits: number;
    is_active: boolean;
    enrolled_count?: number;
    assignments_count?: number;
}

interface Material {
    id: string;
    title: string;
    file_type?: string | null;
    file_size?: number | null;
}

interface UploadFailure {
    file: File;
    error: string;
}

const getExtension = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

const fileKey = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;

const formatSize = (bytes?: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const TeacherCourses = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [teacherName, setTeacherName] = useState("");

    // Course materials
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [existingMaterials, setExistingMaterials] = useState<Material[]>([]);
    const [materialsLoading, setMaterialsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
    const [confirmingMaterialId, setConfirmingMaterialId] = useState<string | null>(null);
    const [deletingMaterialId, setDeletingMaterialId] = useState<string | null>(null);

    const [courseForm, setCourseForm] = useState({
        title: "",
        course_code: "",
        description: "",
        department: "",
        semester: "",
        schedule: "",
        location: "",
        credits: 3
    });

    useEffect(() => {
        fetchTeacherProfile();
        fetchCourses();
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

    // showSpinner=false refreshes the list quietly, so open dialogs are not unmounted.
    const fetchCourses = async (showSpinner = true) => {
        try {
            if (showSpinner) setLoading(true);
            const token = localStorage.getItem('access_token');

            // Fetch courses with enrollment and assignment counts
            const response = await fetch(`${BASE_URL}/assignments/courses-list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch courses');
            }

            const data = await response.json();
            setCourses(data);
        } catch (err) {
            console.error('Error fetching courses:', err);
            toast.error('Failed to load courses');
        } finally {
            setLoading(false);
        }
    };

    // ── course materials ────────────────────────────────────────────────────

    const loadMaterials = async (courseId: string): Promise<Material[]> => {
        try {
            const response = await fetch(`${BASE_URL}/course-materials/course/${courseId}`);
            if (!response.ok) throw new Error('Failed to load materials');
            return await response.json();
        } catch (err) {
            console.error('Error loading materials:', err);
            toast.error('Could not load the existing course materials');
            return [];
        }
    };

    const addFiles = (list: FileList | null) => {
        if (!list) return;

        const accepted: File[] = [];
        const rejected: string[] = [];

        Array.from(list).forEach((file) => {
            if (!MATERIAL_EXTENSIONS.includes(getExtension(file.name))) {
                rejected.push(`${file.name} (file type not allowed)`);
            } else if (file.size === 0) {
                rejected.push(`${file.name} (empty file)`);
            } else if (file.size > MAX_MATERIAL_SIZE) {
                rejected.push(`${file.name} (over 50 MB)`);
            } else {
                accepted.push(file);
            }
        });

        if (rejected.length > 0) {
            toast.error(`Skipped: ${rejected.join(", ")}`);
        }
        if (accepted.length > 0) {
            setPendingFiles((prev) => {
                const known = new Set(prev.map(fileKey));
                return [...prev, ...accepted.filter((f) => !known.has(fileKey(f)))];
            });
        }
    };

    // Uploads one file at a time. Returns the files that failed so they can be retried.
    const uploadMaterials = async (courseId: string, files: File[]): Promise<UploadFailure[]> => {
        const failures: UploadFailure[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setUploadProgress({ done: i, total: files.length });

            const title = (file.name.replace(/\.[^.]+$/, "") || file.name).slice(0, 200);
            const body = new FormData();
            body.append("course_id", courseId);
            body.append("title", title);
            body.append("file", file);

            try {
                const response = await fetch(`${BASE_URL}/course-materials/`, { method: 'POST', body });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => null);
                    failures.push({
                        file,
                        error: typeof errorData?.detail === "string" ? errorData.detail : "Upload failed"
                    });
                }
            } catch {
                failures.push({ file, error: "Network error" });
            }
        }

        setUploadProgress(null);
        return failures;
    };

    const failureMessage = (failures: UploadFailure[]) => {
        const first = failures[0];
        const more = failures.length > 1 ? ` (+${failures.length - 1} more)` : "";
        return `${first.file.name}: ${first.error}${more}`;
    };

    const handleDeleteMaterial = async (materialId: string) => {
        setDeletingMaterialId(materialId);
        try {
            const response = await fetch(`${BASE_URL}/course-materials/${materialId}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(typeof errorData?.detail === "string" ? errorData.detail : 'Failed to delete the file');
            }
            setExistingMaterials((prev) => prev.filter((m) => m.id !== materialId));
            toast.success("File deleted");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setDeletingMaterialId(null);
            setConfirmingMaterialId(null);
        }
    };

    // ── course create / edit / delete ───────────────────────────────────────

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!courseForm.title || !courseForm.course_code || !courseForm.department || !courseForm.semester) {
            toast.error("Please fill in all required fields");
            return;
        }

        setSubmitting(true);

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${BASE_URL}/courses/`, {
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

            const created: Course = await response.json();

            // The course exists now. Upload the files against it.
            const failures = pendingFiles.length > 0
                ? await uploadMaterials(created.id, pendingFiles)
                : [];

            await fetchCourses(false);

            if (failures.length === 0) {
                toast.success("Course created successfully!");
                setIsCreateDialogOpen(false);
                resetForm();
            } else {
                // Keep the course, move to Edit with the failed files still queued for retry.
                toast.error(`Course created, but some files failed. ${failureMessage(failures)}`);
                setPendingFiles(failures.map((f) => f.file));
                setSelectedCourse(created);
                setExistingMaterials(await loadMaterials(created.id));
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(true);
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditCourse = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCourse || !courseForm.title || !courseForm.course_code || !courseForm.department || !courseForm.semester) {
            toast.error("Please fill in all required fields");
            return;
        }

        setSubmitting(true);

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${BASE_URL}/courses/${selectedCourse.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(courseForm)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to update course');
            }

            const failures = pendingFiles.length > 0
                ? await uploadMaterials(selectedCourse.id, pendingFiles)
                : [];

            await fetchCourses(false);

            if (failures.length === 0) {
                toast.success("Course updated successfully!");
                setIsEditDialogOpen(false);
                setSelectedCourse(null);
                resetForm();
            } else {
                toast.error(`Course updated, but some files failed. ${failureMessage(failures)}`);
                setPendingFiles(failures.map((f) => f.file));
                setExistingMaterials(await loadMaterials(selectedCourse.id));
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteCourse = async () => {
        if (!selectedCourse) return;

        setSubmitting(true);

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${BASE_URL}/courses/${selectedCourse.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to delete course');
            }

            toast.success("Course deleted successfully!");
            setIsDeleteDialogOpen(false);
            setSelectedCourse(null);
            await fetchCourses(false);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const openEditDialog = async (course: Course) => {
        setSelectedCourse(course);
        setCourseForm({
            title: course.title,
            course_code: course.course_code,
            description: course.description || "",
            department: course.department,
            semester: course.semester,
            schedule: course.schedule || "",
            location: course.location || "",
            credits: course.credits
        });
        setPendingFiles([]);
        setExistingMaterials([]);
        setIsEditDialogOpen(true);

        setMaterialsLoading(true);
        setExistingMaterials(await loadMaterials(course.id));
        setMaterialsLoading(false);
    };

    const openDeleteDialog = (course: Course) => {
        setSelectedCourse(course);
        setIsDeleteDialogOpen(true);
    };

    const resetForm = () => {
        setCourseForm({
            title: "",
            course_code: "",
            description: "",
            department: "",
            semester: "",
            schedule: "",
            location: "",
            credits: 3
        });
        setPendingFiles([]);
        setExistingMaterials([]);
        setUploadProgress(null);
        setConfirmingMaterialId(null);
    };

    // ── shared dialog pieces ────────────────────────────────────────────────

    const courseFields = (idPrefix: string) => (
        <>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor={`${idPrefix}department`}>
                        Department <span className="text-destructive">*</span>
                    </Label>
                    <Select
                        value={courseForm.department}
                        onValueChange={(value) => setCourseForm({ ...courseForm, department: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select Department" />
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
                <div className="space-y-2">
                    <Label htmlFor={`${idPrefix}semester`}>
                        Semester <span className="text-destructive">*</span>
                    </Label>
                    <Select
                        value={courseForm.semester}
                        onValueChange={(value) => setCourseForm({ ...courseForm, semester: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select Semester" />
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
                <div className="col-span-2 space-y-2">
                    <Label htmlFor={`${idPrefix}course_code`}>
                        Course Code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id={`${idPrefix}course_code`}
                        value={courseForm.course_code}
                        onChange={(e) => setCourseForm({ ...courseForm, course_code: e.target.value })}
                        placeholder="e.g. CSC 301"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`${idPrefix}credits`}>
                        Credits <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id={`${idPrefix}credits`}
                        type="number"
                        min="1"
                        max="6"
                        value={courseForm.credits}
                        onChange={(e) => setCourseForm({ ...courseForm, credits: parseInt(e.target.value) })}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}title`}>
                    Course Title <span className="text-destructive">*</span>
                </Label>
                <Input
                    id={`${idPrefix}title`}
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                    placeholder="e.g. Data Structures and Algorithms"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}description`}>Description</Label>
                <Textarea
                    id={`${idPrefix}description`}
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                    placeholder="Brief course description..."
                    rows={3}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor={`${idPrefix}schedule`}>Schedule</Label>
                    <Input
                        id={`${idPrefix}schedule`}
                        value={courseForm.schedule}
                        onChange={(e) => setCourseForm({ ...courseForm, schedule: e.target.value })}
                        placeholder="e.g. Mon/Wed 10:00 AM"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`${idPrefix}location`}>Location</Label>
                    <Input
                        id={`${idPrefix}location`}
                        value={courseForm.location}
                        onChange={(e) => setCourseForm({ ...courseForm, location: e.target.value })}
                        placeholder="e.g. Room 201"
                    />
                </div>
            </div>
        </>
    );

    const materialsSection = (showExisting: boolean) => (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label>Course materials</Label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting}
                >
                    <Upload className="w-4 h-4" /> Add files
                </Button>
            </div>
            <p className="text-xs text-muted-foreground">
                PDF, Word, PowerPoint, text, ZIP or RAR, up to 50 MB each. New files upload when you save.
                {showExisting && " Deleting an uploaded file takes effect immediately."}
            </p>

            {showExisting && materialsLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="animate-spin" size={14} /> Loading files...
                </div>
            )}

            {showExisting && existingMaterials.map((material) => (
                <div key={material.id} className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{material.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                            {[material.file_type?.toUpperCase(), formatSize(material.file_size)].filter(Boolean).join(" · ")}
                        </span>
                    </div>
                    {deletingMaterialId === material.id ? (
                        <Loader2 className="animate-spin mr-2" size={16} />
                    ) : confirmingMaterialId === material.id ? (
                        <div className="flex gap-1 shrink-0">
                            <Button type="button" size="sm" variant="destructive" onClick={() => handleDeleteMaterial(material.id)}>
                                Delete
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingMaterialId(null)}>
                                Keep
                            </Button>
                        </div>
                    ) : (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setConfirmingMaterialId(material.id)}
                            disabled={submitting}
                            aria-label={`Delete ${material.title}`}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            ))}

            {pendingFiles.map((file) => (
                <div key={fileKey(file)} className="flex items-center justify-between gap-3 rounded-md border border-dashed p-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 shrink-0 text-primary" />
                        <span className="truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                            {formatSize(file.size)} · not uploaded yet
                        </span>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => setPendingFiles((prev) => prev.filter((f) => fileKey(f) !== fileKey(file)))}
                        disabled={submitting}
                        aria-label={`Remove ${file.name}`}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            ))}
        </div>
    );

    const submitLabel = (idle: string, busy: string) =>
        submitting ? (
            <>
                <Loader2 className="animate-spin mr-2" size={16} />
                {uploadProgress ? `Uploading file ${uploadProgress.done + 1} of ${uploadProgress.total}...` : busy}
            </>
        ) : (
            idle
        );

    if (loading) {
        return (
            <DashboardLayout role="teacher" userName={teacherName}>
                <div className="flex items-center justify-center h-screen">
                    <Loader2 className="animate-spin text-primary" size={48} />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="teacher" userName={teacherName}>
            <div className="space-y-8 max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold">My Courses</h1>
                        <p className="text-muted-foreground mt-1">Manage your active courses and curriculum</p>
                    </div>

                    <Button className="gap-2" onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                        <Plus className="w-4 h-4" /> Create New Course
                    </Button>
                </div>

                {courses.length === 0 ? (
                    <div className="text-center py-12">
                        <BookOpen size={48} className="mx-auto mb-3 opacity-50 text-muted-foreground" />
                        <p className="text-lg font-medium text-muted-foreground">No courses yet</p>
                        <p className="text-sm text-muted-foreground mt-1">Create your first course to get started</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course, index) => (
                            <motion.div
                                key={course.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: index * 0.1 }}
                            >
                                <Card className="h-full flex flex-col group overflow-hidden border-border/50 hover:border-primary/20 transition-all hover:shadow-lg">
                                    <div className="h-24 bg-primary/10 relative p-6 flex justify-between items-center">
                                        <span className="text-xs font-medium bg-background/50 backdrop-blur px-2 py-1 rounded border border-border/10">
                                            {course.course_code}
                                        </span>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem className="gap-2" onClick={() => openEditDialog(course)}>
                                                    <Edit className="w-4 h-4" /> Edit Course
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => openDeleteDialog(course)}>
                                                    <Trash2 className="w-4 h-4" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <CardHeader>
                                        <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                                            {course.title}
                                        </CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                            {course.department} • {course.semester}
                                        </p>
                                    </CardHeader>

                                    <CardContent className="flex-grow pb-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1 p-3 rounded-lg bg-secondary/30">
                                                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                                    <Users className="w-3.5 h-3.5" /> Students
                                                </div>
                                                <span className="text-xl font-bold">{course.enrolled_count || 0}</span>
                                            </div>
                                            <div className="flex flex-col gap-1 p-3 rounded-lg bg-secondary/30">
                                                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                                    <BookOpen className="w-3.5 h-3.5" /> Assignments
                                                </div>
                                                <span className="text-xl font-bold">{course.assignments_count || 0}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* One hidden picker shared by both dialogs */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={MATERIAL_EXTENSIONS.map((ext) => `.${ext}`).join(",")}
                className="hidden"
                onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = ""; // lets the same file be picked again
                }}
            />

            {/* Create Course Dialog */}
            <Dialog
                open={isCreateDialogOpen}
                onOpenChange={(open) => {
                    if (!open && submitting) return;
                    setIsCreateDialogOpen(open);
                    if (!open) resetForm();
                }}
            >
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create New Course</DialogTitle>
                        <DialogDescription>
                            Add a new course to your curriculum. Fill in all required fields.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateCourse}>
                        <div className="grid gap-4 py-4">
                            {courseFields("")}
                            {materialsSection(false)}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }} disabled={submitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitLabel("Create Course", "Creating...")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Course Dialog */}
            <Dialog
                open={isEditDialogOpen}
                onOpenChange={(open) => {
                    if (!open && submitting) return;
                    setIsEditDialogOpen(open);
                    if (!open) {
                        setSelectedCourse(null);
                        resetForm();
                    }
                }}
            >
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Course</DialogTitle>
                        <DialogDescription>
                            Update course information and materials. Fill in all required fields.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditCourse}>
                        <div className="grid gap-4 py-4">
                            {courseFields("edit-")}
                            {materialsSection(true)}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedCourse(null); resetForm(); }} disabled={submitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitLabel("Update Course", "Updating...")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the course "{selectedCourse?.title}" and all associated assignments, enrollments and course materials. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteCourse}
                            disabled={submitting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="animate-spin mr-2" size={16} />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DashboardLayout>
    );
};

export default TeacherCourses;