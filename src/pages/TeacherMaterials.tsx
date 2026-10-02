import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, File, Video, MoreHorizontal, Download, Trash } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const mockMaterials = [
    { id: 1, name: "Lecture 1: Introduction to AI", type: "PDF", size: "2.4 MB", course: "CSC 401", date: "2024-03-10" },
    { id: 2, name: "Neural Networks Slides", type: "PPTX", size: "5.1 MB", course: "CSC 401", date: "2024-03-12" },
    { id: 3, name: "Sorting Algorithms Guide", type: "DOCX", size: "1.2 MB", course: "CSC 201", date: "2024-03-15" },
    { id: 4, name: "Web Security Basics", type: "PDF", size: "3.5 MB", course: "CSC 305", date: "2024-03-18" },
];

const TeacherMaterials = () => {
    const [selectedCourse, setSelectedCourse] = useState("all");

    const handleUpload = (e: React.FormEvent) => {
        e.preventDefault();
        toast.success("File uploaded successfully");
    };

    return (
        <DashboardLayout role="teacher" userName="Dr. Teacher">
            <div className="space-y-8 max-w-7xl mx-auto">
                <div>
                    <h1 className="text-3xl font-display font-bold">Course Materials</h1>
                    <p className="text-muted-foreground mt-1">Upload and manage resources for your students</p>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Upload Section */}
                    <Card className="lg:col-span-1 h-fit">
                        <CardHeader>
                            <CardTitle>Upload Resource</CardTitle>
                            <CardDescription>Share documents, videos, or slides</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleUpload} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Select Course</Label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a course" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="csc401">CSC 401 - AI Fundamentals</SelectItem>
                                            <SelectItem value="csc201">CSC 201 - Data Structures</SelectItem>
                                            <SelectItem value="csc305">CSC 305 - Web Dev</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Resource Title</Label>
                                    <Input placeholder="e.g., Lecture 5 Slides" />
                                </div>

                                <div className="space-y-2">
                                    <Label>File</Label>
                                    <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-secondary/50 transition-colors cursor-pointer">
                                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                        <span className="text-sm font-medium">Click to upload or drag and drop</span>
                                        <span className="text-xs text-muted-foreground mt-1">PDF, PPTX, DOCX up to 50MB</span>
                                    </div>
                                </div>

                                <Button type="submit" className="w-full">
                                    Upload Material
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Materials List */}
                    <Card className="lg:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Recent Uploads</CardTitle>
                                <CardDescription>Manage your course materials</CardDescription>
                            </div>
                            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by Course" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Courses</SelectItem>
                                    <SelectItem value="CSC 401">CSC 401</SelectItem>
                                    <SelectItem value="CSC 201">CSC 201</SelectItem>
                                </SelectContent>
                            </Select>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Resource Name</TableHead>
                                        <TableHead>Course</TableHead>
                                        <TableHead>Size</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mockMaterials.map((file) => (
                                        <TableRow key={file.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 rounded bg-secondary/50">
                                                        {file.type === "PDF" ? <FileText className="w-4 h-4 text-red-500" /> :
                                                            file.type === "PPTX" ? <File className="w-4 h-4 text-orange-500" /> :
                                                                <File className="w-4 h-4 text-blue-500" />}
                                                    </div>
                                                    {file.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>{file.course}</TableCell>
                                            <TableCell>{file.size}</TableCell>
                                            <TableCell>{file.date}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="icon">
                                                        <Download className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                        <Trash className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default TeacherMaterials;
