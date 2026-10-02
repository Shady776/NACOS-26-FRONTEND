import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { GraduationCap, Lock, Mail, ArrowRight, User, Eye, EyeOff, CheckCircle, XCircle, Loader2, BookOpen, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { BASE_URL } from "@/components/api/api";


const Signup = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        username: "",
        password: "",
        confirmPassword: "",
        matricNumber: "",
        department: ""
    });
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [usernameStatus, setUsernameStatus] = useState<{
        checking: boolean;
        available: boolean | null;
        message: string;
    }>({ checking: false, available: null, message: '' });

    const departments = [
        { value: 'CSC', label: 'Computer Science' },
        { value: 'SEN', label: 'Software Engineering' },
        { value: 'IFT', label: 'Information Technology' },
        { value: 'CYB', label: 'Cybersecurity' },
    ];

    useEffect(() => {
        if (!formData.username || formData.username.length < 3) {
            setUsernameStatus({ checking: false, available: null, message: '' });
            return;
        }
        const timeoutId = setTimeout(() => checkUsernameAvailability(formData.username), 500);
        return () => clearTimeout(timeoutId);
    }, [formData.username]);

    const checkUsernameAvailability = async (username: string) => {
        setUsernameStatus({ checking: true, available: null, message: '' });
        try {
            const response = await fetch(`${BASE_URL}/auth/check-username/${username.toLowerCase()}`);
            const data = await response.json();
            if (response.ok) {
                setUsernameStatus({
                    checking: false,
                    available: data.available,
                    message: data.available ? 'Username is available' : 'Username is already taken'
                });
            } else {
                setUsernameStatus({ checking: false, available: null, message: '' });
            }
        } catch (err) {
            setUsernameStatus({ checking: false, available: null, message: '' });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) { toast.error("Passwords do not match"); return; }
        if (!formData.matricNumber) { toast.error('Matric number is required'); return; }
        if (!formData.department) { toast.error('Please select a department'); return; }
        if (usernameStatus.available === false) { toast.error('Please choose a different username'); return; }
        if (usernameStatus.checking) { toast.error('Please wait while we check username availability'); return; }

        setIsLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    username: formData.username.toLowerCase(),
                    full_name: formData.fullName,
                    matric_number: formData.matricNumber,
                    department: formData.department,
                    role: "student",
                    password: formData.password
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Registration failed');
            toast.success('Registration successful! Please sign in.');
            setTimeout(() => navigate('/login'), 1500);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-2">

            {/* Right side - Visual */}
            <div className="hidden lg:flex flex-col justify-between bg-primary/5 p-12 relative overflow-hidden order-1 lg:order-2">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />

                <div className="relative z-10">
                    <h2 className="text-3xl font-display font-bold mb-4">Start your journey</h2>
                    <p className="text-lg text-muted-foreground max-w-md">
                        Join hundreds of KDU NACOS students already managing their academic life in one place.
                    </p>
                </div>

                <div className="relative z-10 grid gap-4">
                    <Card className="bg-background/50 backdrop-blur-sm border-primary/10">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                                <BookOpen className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="font-medium">Course Access</p>
                                <p className="text-sm text-muted-foreground">Materials available 24/7</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-background/50 backdrop-blur-sm border-primary/10 translate-x-8">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                <ClipboardList className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="font-medium">Track Progress</p>
                                <p className="text-sm text-muted-foreground">Grades and assignments in one view</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Left side - Form */}
            <div className="flex items-center justify-center px-6 py-10 bg-background order-2 lg:order-1">
                <div className="w-full max-w-md">
                    <div className="text-center mb-7">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground mb-3 shadow-lg shadow-primary/30">
                            <GraduationCap className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-display font-bold">Create an account</h1>
                        <p className="text-muted-foreground text-sm mt-1">Join the academic portal today</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full Name + Email */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="fullName">Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input id="fullName" name="fullName" placeholder="John Doe" className="pl-9 bg-background" value={formData.fullName} onChange={handleChange} required disabled={isLoading} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="email">Email address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input id="email" name="email" type="email" placeholder="name@example.com" className="pl-9 bg-background" value={formData.email} onChange={handleChange} required disabled={isLoading} />
                                </div>
                            </div>
                        </div>

                        {/* Username + Matric */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="username">Username</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="username" name="username" placeholder="johndoe"
                                        className={`pl-9 pr-9 bg-background ${usernameStatus.available === true ? 'border-green-500' : usernameStatus.available === false ? 'border-red-500' : ''}`}
                                        value={formData.username} onChange={handleChange} required disabled={isLoading}
                                    />
                                    <div className="absolute right-3 top-3">
                                        {usernameStatus.checking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                        {!usernameStatus.checking && usernameStatus.available === true && <CheckCircle className="h-4 w-4 text-green-500" />}
                                        {!usernameStatus.checking && usernameStatus.available === false && <XCircle className="h-4 w-4 text-red-500" />}
                                    </div>
                                </div>
                                {usernameStatus.message && (
                                    <p className={`text-xs ${usernameStatus.available ? 'text-green-600' : 'text-red-600'}`}>{usernameStatus.message}</p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="matricNumber">Matric Number</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input id="matricNumber" name="matricNumber" placeholder="KDU/2024/001" className="pl-9 bg-background" value={formData.matricNumber} onChange={handleChange} required disabled={isLoading} />
                                </div>
                            </div>
                        </div>

                        {/* Department */}
                        <div className="space-y-1.5">
                            <Label htmlFor="department">Department</Label>
                            <Select value={formData.department} onValueChange={(v) => setFormData(prev => ({ ...prev, department: v }))} disabled={isLoading}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select your department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map((dept) => (
                                        <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Password + Confirm */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input id="password" name="password" type={showPassword ? "text" : "password"} className="pl-9 pr-9 bg-background" value={formData.password} onChange={handleChange} required disabled={isLoading} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground" disabled={isLoading}>
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} className="pl-9 pr-9 bg-background" value={formData.confirmPassword} onChange={handleChange} required disabled={isLoading} />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground" disabled={isLoading}>
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Creating account..." : (<>Create account <ArrowRight className="ml-2 h-4 w-4" /></>)}
                        </Button>
                    </form>

                    <div className="text-center text-sm mt-5">
                        <span className="text-muted-foreground">Already have an account? </span>
                        <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default Signup;