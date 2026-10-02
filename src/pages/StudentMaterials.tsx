import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Download, File, FileArchive, FileImage, FileText, FolderOpen, Loader2, Presentation, Search } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BASE_URL } from "@/components/api/api";

const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const iconFor = (fileType) => {
    const t = (fileType || "").toLowerCase();
    if (["ppt", "pptx"].includes(t)) return Presentation;
    if (["zip", "rar"].includes(t)) return FileArchive;
    if (["png", "jpg", "jpeg", "webp", "gif"].includes(t)) return FileImage;
    if (["pdf", "doc", "docx", "txt"].includes(t)) return FileText;
    return File;
};

const StudentMaterials = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [courses, setCourses] = useState([]);
    const [coursesLoading, setCoursesLoading] = useState(true);
    const [materials, setMaterials] = useState([]);
    const [materialsLoading, setMaterialsLoading] = useState(false);
    const [materialsError, setMaterialsError] = useState("");
    const [query, setQuery] = useState("");
    const [downloadingId, setDownloadingId] = useState(null);

    const selectedCourseId = searchParams.get("course") || "";

    // The courses this student is enrolled in.
    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`${BASE_URL}/enrollments/my-courses`);
                if (!res.ok) throw new Error();
                const enrollments = await res.json();
                const list = enrollments
                    .map((e) => e.course)
                    .filter(Boolean)
                    .sort((a, b) => (a.course_code || a.title).localeCompare(b.course_code || b.title));
                setCourses(list);
            } catch {
                toast.error("Could not load your courses");
            } finally {
                setCoursesLoading(false);
            }
        };
        load();
    }, []);

    // Pick the first course when none (or an unknown one) is in the link.
    useEffect(() => {
        if (courses.length === 0) return;
        if (!courses.some((c) => c.id === selectedCourseId)) {
            setSearchParams({ course: courses[0].id }, { replace: true });
        }
    }, [courses, selectedCourseId]);

    // Materials of the chosen course.
    useEffect(() => {
        if (!selectedCourseId || !courses.some((c) => c.id === selectedCourseId)) return;
        let cancelled = false;
        const load = async () => {
            setMaterialsLoading(true);
            setMaterialsError("");
            setQuery("");
            try {
                const res = await fetch(`${BASE_URL}/course-materials/course/${selectedCourseId}`);
                if (!res.ok) {
                    const err = await res.json().catch(() => null);
                    throw new Error(err?.detail || "Could not load the materials");
                }
                const data = await res.json();
                if (!cancelled) setMaterials(data);
            } catch (err) {
                if (!cancelled) {
                    setMaterials([]);
                    setMaterialsError(err.message);
                }
            } finally {
                if (!cancelled) setMaterialsLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [selectedCourseId, courses]);

    const handleDownload = async (material) => {
        setDownloadingId(material.id);
        try {
            const res = await fetch(`${BASE_URL}/course-materials/${material.id}/download`);
            if (!res.ok) {
                const err = await res.json().catch(() => null);
                throw new Error(err?.detail || "Could not download the file");
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const ext = (material.file_type || "").toLowerCase();
            link.href = url;
            link.download = `${material.title}${ext ? `.${ext}` : ""}`;
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

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return materials;
        return materials.filter(
            (m) => m.title.toLowerCase().includes(q) || (m.description || "").toLowerCase().includes(q)
        );
    }, [materials, query]);

    return (
        <DashboardLayout role="student" userName="Student">
            <div className="space-y-6 max-w-5xl mx-auto">
                <div>
                    <h1 className="text-3xl font-display font-bold">Course Materials</h1>
                    <p className="text-muted-foreground mt-1">Lecture notes, slides and files shared by your lecturers</p>
                </div>

                {coursesLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : courses.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="font-semibold text-lg mb-2">You are not enrolled in any course yet</h3>
                            <p className="text-muted-foreground">Enrol in a course to see its materials here.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="md:w-80">
                                <Select
                                    value={selectedCourseId}
                                    onValueChange={(id) => setSearchParams({ course: id })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a course" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {courses.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.course_code ? `${c.course_code} - ` : ""}{c.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search materials..."
                                    className="pl-9"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {materialsLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : materialsError ? (
                            <Card>
                                <CardContent className="py-12 text-center text-muted-foreground">{materialsError}</CardContent>
                            </Card>
                        ) : materials.length === 0 ? (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="font-semibold text-lg mb-2">No materials yet</h3>
                                    <p className="text-muted-foreground">Your lecturer has not shared any files for this course.</p>
                                </CardContent>
                            </Card>
                        ) : visible.length === 0 ? (
                            <Card>
                                <CardContent className="py-10 text-center text-muted-foreground">
                                    Nothing matches "{query}".
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-3">
                                {visible.map((m, i) => {
                                    const Icon = iconFor(m.file_type);
                                    const busy = downloadingId === m.id;
                                    return (
                                        <motion.div
                                            key={m.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: Math.min(i, 8) * 0.03 }}
                                        >
                                            <Card>
                                                <CardContent className="p-4 flex items-center gap-4">
                                                    <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold truncate">{m.title}</h3>
                                                        {m.description && (
                                                            <p className="text-sm text-muted-foreground line-clamp-2">{m.description}</p>
                                                        )}
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {[
                                                                m.file_type ? m.file_type.toUpperCase() : null,
                                                                formatSize(m.file_size),
                                                                `Added ${new Date(m.uploaded_at).toLocaleDateString()}`,
                                                            ].filter(Boolean).join(" • ")}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-2 shrink-0"
                                                        disabled={busy}
                                                        onClick={() => handleDownload(m)}
                                                    >
                                                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                                        Download
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </DashboardLayout>
    );
};

export default StudentMaterials;
