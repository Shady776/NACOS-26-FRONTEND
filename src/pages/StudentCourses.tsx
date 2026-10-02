import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, BookOpen, Clock, MoreVertical, PlayCircle } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock Data
const courses = [
    {
        id: 1,
        title: "Introduction to Algorithms",
        code: "CSC 202",
        instructor: "Dr. Sarah Wilson",
        progress: 75,
        totalLessons: 24,
        completedLessons: 18,
        image: "bg-blue-500/10", // Placeholder for actual image
        lastAccessed: "2 hours ago",
        status: "Active"
    },
    {
        id: 2,
        title: "Database Management Systems",
        code: "CSC 305",
        instructor: "Prof. Michael Chen",
        progress: 60,
        totalLessons: 30,
        completedLessons: 18,
        image: "bg-green-500/10",
        lastAccessed: "1 day ago",
        status: "Active"
    },
    {
        id: 3,
        title: "Software Engineering Principles",
        code: "CSC 301",
        instructor: "Dr. Emily Davis",
        progress: 45,
        totalLessons: 20,
        completedLessons: 9,
        image: "bg-purple-500/10",
        lastAccessed: "3 days ago",
        status: "Active"
    },
    {
        id: 4,
        title: "Web Development Fundamentals",
        code: "CSC 205",
        instructor: "Mr. James Miller",
        progress: 100,
        totalLessons: 15,
        completedLessons: 15,
        image: "bg-orange-500/10",
        lastAccessed: "1 week ago",
        status: "Completed"
    },
    {
        id: 5,
        title: "Data Structures",
        code: "CSC 201",
        instructor: "Dr. Sarah Wilson",
        progress: 90,
        totalLessons: 28,
        completedLessons: 25,
        image: "bg-red-500/10",
        lastAccessed: "2 days ago",
        status: "Active"
    },
    {
        id: 6,
        title: "Operating Systems",
        code: "CSC 302",
        instructor: "Prof. David Anderson",
        progress: 10,
        totalLessons: 22,
        completedLessons: 2,
        image: "bg-indigo-500/10",
        lastAccessed: "5 days ago",
        status: "Active"
    }
];

const StudentCourses = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState("All");

    const filteredCourses = courses.filter(course => {
        const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filter === "All" || course.status === filter;
        return matchesSearch && matchesFilter;
    });

    return (
        <DashboardLayout role="student" userName="John Doe">
            <div className="space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold">My Courses</h1>
                        <p className="text-muted-foreground mt-1">Manage and track your academic progress</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search courses..."
                                className="pl-9 bg-background"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="gap-2">
                                    <Filter className="w-4 h-4" />
                                    <span className="hidden sm:inline">Filter: {filter}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setFilter("All")}>All Courses</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilter("Active")}>Active</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilter("Completed")}>Completed</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Course Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map((course, index) => (
                        <motion.div
                            key={course.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            className="group relative bg-card rounded-xl border border-border/50 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300"
                        >
                            {/* Course Header/Image Area */}
                            <div className={`h-32 ${course.image} relative p-6 flex flex-col justify-between`}>
                                <div className="flex justify-between items-start">
                                    <span className="px-2 py-1 bg-background/80 backdrop-blur text-xs font-medium rounded-md border border-border/50">
                                        {course.code}
                                    </span>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/50 backdrop-blur hover:bg-background">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Course Content */}
                            <div className="p-6 space-y-4">
                                <div>
                                    <h3 className="font-display font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                                        {course.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">{course.instructor}</p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">{course.completedLessons}/{course.totalLessons} Lessons</span>
                                        <span className="font-medium">{course.progress}%</span>
                                    </div>
                                    <Progress value={course.progress} className="h-2" />
                                </div>

                                <div className="pt-2 flex items-center justify-between border-t border-border/50">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>{course.lastAccessed}</span>
                                    </div>
                                    <Button size="sm" className="gap-2 group-hover:bg-primary group-hover:text-primary-foreground">
                                        Continue <PlayCircle className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default StudentCourses;
