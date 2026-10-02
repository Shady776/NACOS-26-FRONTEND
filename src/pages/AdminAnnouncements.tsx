import { useState } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const initialAnnouncements = [
    { id: 1, title: "Server Maintenance Scheduled", content: "The system will be down for maintenance on Sunday at 2 AM.", date: "2026-01-18" },
    { id: 2, title: "New Semester Registration", content: "Registration for the new semester is now open for all students.", date: "2026-01-15" }
];

const AdminAnnouncements = () => {
    const [announcements, setAnnouncements] = useState(initialAnnouncements);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newPost, setNewPost] = useState({ title: "", content: "" });

    const handleCreate = () => {
        if (!newPost.title || !newPost.content) return;
        const post = {
            id: Date.now(),
            ...newPost,
            date: new Date().toISOString().split('T')[0]
        };
        setAnnouncements([post, ...announcements]);
        setNewPost({ title: "", content: "" });
        setIsDialogOpen(false);
        toast.success("Announcement posted");
    };

    const handleDelete = (id: number) => {
        setAnnouncements(announcements.filter(a => a.id !== id));
        toast.success("Announcement deleted");
    };

    return (
        <DashboardLayout role="admin" userName="Admin User">
            <div className="space-y-8 max-w-7xl mx-auto">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Announcements</h1>
                        <p className="text-muted-foreground mt-1">Manage global system announcements</p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" /> New Announcement
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Post Announcement</DialogTitle>
                                <DialogDescription>This message will be visible to all users.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Title</Label>
                                    <Input
                                        value={newPost.title}
                                        onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                                        placeholder="Enter title..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Content</Label>
                                    <Textarea
                                        value={newPost.content}
                                        onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                                        placeholder="Enter announcement details..."
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreate}>Post Message</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="space-y-4">
                    {announcements.map((item) => (
                        <Card key={item.id}>
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <div>
                                    <CardTitle className="text-lg">{item.title}</CardTitle>
                                    <CardDescription className="mt-1">{item.date}</CardDescription>
                                </div>
                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">{item.content}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminAnnouncements;
