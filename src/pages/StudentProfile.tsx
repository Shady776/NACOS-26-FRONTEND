import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession } from "@/lib/auth";
import { User, Mail, Phone, MapPin, Calendar, Book, Shield, GraduationCap, Settings, Camera, LogOut } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const StudentProfile = () => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [user, setUser] = useState({
        name: "John Doe",
        email: "john.doe@university.edu",
        phone: "+1 (555) 123-4567",
        studentId: "STU-2024-001",
        major: "Computer Science",
        year: "3rd Year",
        address: "123 Campus Drive, Dorm A, Room 304"
    });

    const handleSave = () => {
        setIsEditing(false);
        // Mock API call to save user data
        console.log("Saving user data:", user);
    };

    return (
        <DashboardLayout role="student" userName="John Doe">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Profile Header */}
                <div className="relative rounded-xl bg-card border border-border/50 overflow-hidden">
                    <div className="h-32 bg-primary/10 w-full" />
                    <div className="px-6 pb-6">
                        <div className="relative flex justify-between items-end -mt-12 mb-4">
                            <div className="relative">
                                <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                                    <AvatarImage src="/placeholder.svg" />
                                    <AvatarFallback className="text-2xl">JD</AvatarFallback>
                                </Avatar>
                                <Button
                                    size="icon"
                                    variant="secondary"
                                    className="absolute bottom-0 right-0 rounded-full h-8 w-8 shadow-sm"
                                >
                                    <Camera className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" className="gap-2">
                                    <Settings className="w-4 h-4" /> Settings
                                </Button>
                                <Button
                                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                    className={isEditing ? "bg-green-600 hover:bg-green-700" : ""}
                                >
                                    {isEditing ? "Save Changes" : "Edit Profile"}
                                </Button>
                            </div>
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold font-display">{user.name}</h1>
                            <p className="text-muted-foreground">{user.major} Student • ID: {user.studentId}</p>
                        </div>
                    </div>
                </div>

                {/* Content Tabs */}
                <Tabs defaultValue="personal" className="w-full">
                    <TabsList className="grid w-full md:w-[400px] grid-cols-3 mb-8">
                        <TabsTrigger value="personal">Personal</TabsTrigger>
                        <TabsTrigger value="academic">Academic</TabsTrigger>
                        <TabsTrigger value="security">Security</TabsTrigger>
                    </TabsList>

                    <TabsContent value="personal" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Personal Information</CardTitle>
                                <CardDescription>Manage your contact details and address</CardDescription>
                            </CardHeader>
                            <CardContent className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Full Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            value={user.name}
                                            disabled={!isEditing}
                                            onChange={e => setUser({ ...user, name: e.target.value })}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            value={user.email}
                                            disabled={!isEditing}
                                            onChange={e => setUser({ ...user, email: e.target.value })}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            value={user.phone}
                                            disabled={!isEditing}
                                            onChange={e => setUser({ ...user, phone: e.target.value })}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Address</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            value={user.address}
                                            disabled={!isEditing}
                                            onChange={e => setUser({ ...user, address: e.target.value })}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="academic" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Academic Records</CardTitle>
                                <CardDescription>View your current standing and history</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                                        <div className="flex items-center gap-3 mb-2">
                                            <GraduationCap className="h-5 w-5 text-primary" />
                                            <span className="font-medium">Current Major</span>
                                        </div>
                                        <p className="text-lg font-semibold">{user.major}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Calendar className="h-5 w-5 text-primary" />
                                            <span className="font-medium">Academic Year</span>
                                        </div>
                                        <p className="text-lg font-semibold">{user.year}</p>
                                    </div>
                                </div>

                                <Separator />

                                <div>
                                    <h3 className="font-medium mb-4 flex items-center gap-2">
                                        <Book className="h-4 w-4" /> Current Semester Courses
                                    </h3>
                                    <div className="space-y-3">
                                        {["Introduction to Algorithms", "Database Systems", "Software Engineering"].map((course, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 rounded-md bg-secondary/20">
                                                <span>{course}</span>
                                                <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full border border-green-500/20">Enrolled</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="security" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Security Settings</CardTitle>
                                <CardDescription>Manage your password and account security</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Two-factor Authentication</Label>
                                            <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                                        </div>
                                        <Switch />
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Login Notifications</Label>
                                            <p className="text-sm text-muted-foreground">Receive emails about new sign-ins</p>
                                        </div>
                                        <Switch defaultChecked />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <Button variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                        <Shield className="w-4 h-4 mr-2" /> Change Password
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-start">
                            <Button
                                variant="destructive"
                                className="gap-2"
                                onClick={async () => {
                                    await clearSession(); // revokes the session on the server and clears the cookies
                                    navigate("/login", { replace: true });
                                }}
                            >
                                <LogOut className="w-4 h-4" /> Sign Out
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
};

export default StudentProfile;
