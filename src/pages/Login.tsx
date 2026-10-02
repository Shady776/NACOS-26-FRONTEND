import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Lock, User, ArrowRight, Users, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { BASE_URL } from "@/components/api/api";
import { resetSession } from "@/lib/auth";

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: "",
        password: ""
    });
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const formBody = new URLSearchParams();
            formBody.append('username', formData.username.toLowerCase());
            formBody.append('password', formData.password);

            const response = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formBody,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Login failed');
            }

            // The backend set the login cookies (HttpOnly) on this response.
            // Nothing is stored in localStorage. Forget any previous user's cached session.
            resetSession();
            const userRole: string | undefined = data.role;

            toast.success('Login successful! Redirecting...');
            
            // Redirect based on role using the correct routes from App.tsx
            setTimeout(() => {
                if (userRole === 'admin') {
                    navigate('/admin');
                } else if (userRole === 'teacher') {
                    navigate('/teacher');
                } else if (userRole === 'student') {
                    navigate('/student');
                } else {
                    // Default to student dashboard if role is not recognized
                    navigate('/student');
                }
            }, 1000);
        } catch (err: any) {
            toast.error(err.message);
            console.error('Login error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {/* Left side - Form */}
            <div className="flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground mb-4 shadow-lg shadow-primary/30">
                            <GraduationCap className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-display font-bold">Welcome back</h1>
                        <p className="text-muted-foreground">Sign in to your academic portal</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="username"
                                    name="username"
                                    type="text"
                                    placeholder="Enter your username"
                                    className="pl-9 bg-background"
                                    value={formData.username}
                                    onChange={handleChange}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <Link
                                    to="#"
                                    className="text-sm font-medium text-primary hover:underline"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        toast.info("Forgot password feature coming soon!");
                                    }}
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    className="pl-9 pr-9 bg-background"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                    disabled={isLoading}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Signing in..." : (
                                <>
                                    Sign in <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="text-center text-sm">
                        <span className="text-muted-foreground">Don't have an account? </span>
                        <Link to="/signup" className="font-medium text-primary hover:underline">
                            Sign up
                        </Link>
                    </div>
                </div>
            </div>

            {/* Right side - Visual */}
            <div className="hidden lg:flex flex-col justify-between bg-primary/5 p-12 relative overflow-hidden">
                {/* Abstract shapes */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />

                <div className="relative z-10">
                    <h2 className="text-3xl font-display font-bold mb-4">Nacos Nexus</h2>
                    <p className="text-lg text-muted-foreground max-w-md">
                        Your all-in-one platform for academic excellence. Connect, learn, and grow with a community of motivated scholars.
                    </p>
                </div>

                <div className="relative z-10 grid gap-4">
                    <Card className="bg-background/50 backdrop-blur-sm border-primary/10">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                                <GraduationCap className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="font-medium">Student Success</p>
                                <p className="text-sm text-muted-foreground">Access resources anytime</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-background/50 backdrop-blur-sm border-primary/10 translate-x-8">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="font-medium">Community Driven</p>
                                <p className="text-sm text-muted-foreground">Connect with peers</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Login;