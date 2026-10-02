import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Filter, BookOpen, Clock, Users, Star, CheckCircle2, MinusCircle, X, Loader2, User } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BASE_URL } from "@/components/api/api";

const Spinner = () => (
    <div className="flex items-center justify-center h-64">
        <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Loading courses...</p>
        </div>
    </div>
);

const StudentEnrollment = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [availableCourses, setAvailableCourses] = useState([]);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [modalType, setModalType] = useState(null);
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async (silent = false) => {
        try {
            if (!silent) {
                setLoading(true);
                setShowContent(false);
            }
            const token = localStorage.getItem('access_token');
            
            const startTime = Date.now();

            const coursesResponse = await fetch(`${BASE_URL}/courses/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!coursesResponse.ok) {
                throw new Error('Failed to fetch courses');
            }

            const allCourses = await coursesResponse.json();

            const enrollmentsResponse = await fetch(`${BASE_URL}/enrollments/my-courses`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!enrollmentsResponse.ok) {
                throw new Error('Failed to fetch enrollments');
            }

            const enrollments = await enrollmentsResponse.json();

            const enrolledCourseIds = new Set(enrollments.map(e => e.course_id));
            const enrolled = allCourses
                .filter(course => enrolledCourseIds.has(course.id))
                .map(course => {
                    const enrollment = enrollments.find(e => e.course_id === course.id);
                    return { ...course, enrollment_id: enrollment.id };
                });

            const available = allCourses.filter(course => !enrolledCourseIds.has(course.id));

            if (silent) {
                setEnrolledCourses(enrolled);
                setAvailableCourses(available);
            } else {
                const elapsedTime = Date.now() - startTime;
                const remainingTime = Math.max(1500 - elapsedTime, 0);
                
                setTimeout(() => {
                    setEnrolledCourses(enrolled);
                    setAvailableCourses(available);
                    setLoading(false);
                    setTimeout(() => setShowContent(true), 50);
                }, remainingTime);
            }
        } catch (err) {
            toast.error(err.message);
            console.error('Error fetching data:', err);
            if (!silent) {
                setLoading(false);
                setTimeout(() => setShowContent(true), 50);
            }
        }
    };

    const handleEnrollClick = (course) => {
        setSelectedCourse(course);
        setModalType('enroll');
    };

    const handleUnenrollClick = (course) => {
        setSelectedCourse(course);
        setModalType('unenroll');
    };

    const handleEnroll = async () => {
        try {
            setProcessing(true);
            const token = localStorage.getItem('access_token');

            const response = await fetch(`${BASE_URL}/enrollments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    course_id: selectedCourse.id
                }),
            });

            if (!response.ok) {
                let errorMessage = 'Enrollment failed';
                try {
                    const data = await response.json();
                    errorMessage = data.detail || data.message || errorMessage;
                } catch (e) {
                    // Response might not have JSON body
                }
                throw new Error(errorMessage);
            }

            toast.success(`Successfully enrolled in ${selectedCourse.title}`, {
                description: "You can now access this course in your dashboard.",
            });
            closeModal();
            await fetchData(true);
        } catch (err) {
            toast.error(err.message);
            console.error('Error enrolling in course:', err);
        } finally {
            setProcessing(false);
        }
    };

    const handleUnenroll = async () => {
        try {
            setProcessing(true);
            const token = localStorage.getItem('access_token');

            const response = await fetch(`${BASE_URL}/enrollments/${selectedCourse.enrollment_id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok && response.status !== 204) {
                const data = await response.json();
                throw new Error(data.detail || 'Unenrollment failed');
            }

            toast.success('Successfully unenrolled from course!');
            closeModal();
            await fetchData(true);
        } catch (err) {
            toast.error(err.message);
            console.error('Error unenrolling from course:', err);
        } finally {
            setProcessing(false);
        }
    };

    const closeModal = () => {
        setSelectedCourse(null);
        setModalType(null);
    };

    const filteredCourses = [...availableCourses, ...enrolledCourses].filter(course => {
        const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.course_code.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const isEnrolled = (courseId) => {
        return enrolledCourses.some(c => c.id === courseId);
    };

    if (loading) {
        return (
            <DashboardLayout role="student" userName="John Doe">
                <Spinner />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="student" userName="John Doe">
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                @keyframes modalSlideIn {
                    from {
                        transform: scale(0.9) translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: scale(1) translateY(0);
                        opacity: 1;
                    }
                }
                
                @keyframes backdropFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                .animate-modalSlideIn {
                    animation: modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                
                .animate-backdropFadeIn {
                    animation: backdropFadeIn 0.2s ease-out;
                }
            `}</style>

            <div className="space-y-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Course Catalog</h1>
                        <p className="text-muted-foreground mt-1">Discover and enroll in new courses to expand your knowledge</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search courses..."
                                className="pl-9 bg-background"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Course Grid - Smaller Cards */}
                <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredCourses.map((course, index) => {
                        const enrolled = isEnrolled(course.id);
                        return (
                            <motion.div
                                key={course.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: index * 0.1 }}
                            >
                                <Card className="h-full flex flex-col overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20 group">
                                    <CardHeader className="pb-3 pt-4 px-4 relative">
                                        <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
                                            <Badge variant="outline" className="text-xs whitespace-nowrap shrink-0">
                                                {course.course_code}
                                            </Badge>
                                            {enrolled && (
                                                <div className="bg-green-500 text-white px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 whitespace-nowrap shrink-0">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Enrolled
                                                </div>
                                            )}
                                        </div>
                                        <CardTitle className="text-base group-hover:text-primary transition-colors line-clamp-2">
                                            {course.title}
                                        </CardTitle>
                                        <CardDescription className="line-clamp-2 mt-1 text-xs">
                                            {course.description || 'No description available'}
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="py-2 px-4 flex-grow">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                                                {course.instructor ? course.instructor.split(' ').map(n => n[0]).join('') : 'N/A'}
                                            </div>
                                            <span className="text-xs font-medium truncate">{course.instructor || 'TBD'}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            <span className="font-semibold">{course.credits || 0} Credits</span>
                                        </div>
                                    </CardContent>

                                    <CardFooter className="pt-2 pb-4 px-4">
                                        {enrolled ? (
                                            <Button 
                                                size="sm"
                                                className="w-full bg-red-500 hover:bg-red-600 h-8 text-xs"
                                                onClick={() => handleUnenrollClick(course)}
                                            >
                                                <MinusCircle className="w-3 h-3 mr-1" /> Unenroll
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                className="w-full h-8 text-xs"
                                                onClick={() => handleEnrollClick(course)}
                                            >
                                                Enroll Now
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Enroll Modal - Green/Black Theme */}
            {selectedCourse && modalType === 'enroll' && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-backdropFadeIn">
                    <div className="bg-gray-900 rounded-3xl w-full max-w-lg p-0 shadow-2xl overflow-hidden relative animate-modalSlideIn border border-green-500/20">
                        <div className="h-32 bg-gradient-to-r from-green-600 to-emerald-700 p-6 relative">
                            <button
                                onClick={closeModal}
                                className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                            <div className="absolute -bottom-6 left-8">
                                <div className="bg-gray-900 p-1 rounded-2xl shadow-lg inline-block border border-green-500/30">
                                    <div className="bg-green-500/20 w-16 h-16 rounded-xl flex items-center justify-center text-green-400 border border-green-500/30">
                                        <BookOpen size={32} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-10 px-8 pb-8">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="text-green-400 font-bold text-sm tracking-wide uppercase">
                                        {selectedCourse.course_code || 'TBD'}
                                    </span>
                                    <h2 className="text-2xl font-extrabold text-white mt-1">
                                        {selectedCourse.title || 'TBD'}
                                    </h2>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 my-6">
                                <div className="flex items-center gap-2 text-sm text-gray-300 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700">
                                    <User size={14} className="text-green-400" />
                                    {selectedCourse.instructor || 'TBD'}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-300 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700">
                                    <BookOpen size={14} className="text-green-400" />
                                    {selectedCourse.credits || 0} Credits
                                </div>
                            </div>

                            <div className="prose prose-sm mb-8">
                                <h4 className="font-bold text-green-400 text-sm mb-2 uppercase tracking-wider">Course Overview</h4>
                                <p className="leading-relaxed text-gray-300">{selectedCourse.description || 'No description available'}</p>
                            </div>

                            <div className="flex gap-3">
                                <button 
                                    onClick={handleEnroll}
                                    disabled={processing}
                                    className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all duration-200 shadow-lg shadow-green-900/50 hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
                                >
                                    {processing ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" style={{ animation: 'spin 0.8s linear infinite' }}></div>
                                            Enrolling...
                                        </span>
                                    ) : 'Enroll Course'}
                                </button>
                                <button
                                    onClick={closeModal}
                                    disabled={processing}
                                    className="px-6 py-3 bg-gray-800 text-gray-300 rounded-xl font-bold hover:bg-gray-700 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer border border-gray-700"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Unenroll Modal */}
            {selectedCourse && modalType === 'unenroll' && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-backdropFadeIn">
                    <div className="bg-card rounded-3xl w-full max-w-md p-0 shadow-2xl overflow-hidden relative animate-modalSlideIn">
                        <div className="h-32 bg-gradient-to-r from-red-600 to-rose-700 p-6 relative">
                            <button
                                onClick={closeModal}
                                className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                            <div className="absolute -bottom-6 left-8">
                                <div className="bg-card p-1 rounded-2xl shadow-lg inline-block">
                                    <div className="bg-red-50 w-16 h-16 rounded-xl flex items-center justify-center text-red-600">
                                        <MinusCircle size={32} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-10 px-8 pb-8">
                            <h2 className="text-2xl font-extrabold text-foreground mb-2">
                                Unenroll from Course?
                            </h2>
                            <p className="text-muted-foreground mb-6">
                                Are you sure you want to unenroll from <span className="font-bold">{selectedCourse.course_code}</span> - {selectedCourse.title}? This action cannot be undone.
                            </p>

                            <div className="flex gap-3">
                                <button 
                                    onClick={handleUnenroll}
                                    disabled={processing}
                                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all duration-200 shadow-lg shadow-red-200 hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
                                >
                                    {processing ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" style={{ animation: 'spin 0.8s linear infinite' }}></div>
                                            Unenrolling...
                                        </span>
                                    ) : 'Yes, Unenroll'}
                                </button>
                                <button
                                    onClick={closeModal}
                                    disabled={processing}
                                    className="px-6 py-3 bg-secondary text-foreground rounded-xl font-bold hover:bg-secondary/80 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default StudentEnrollment;