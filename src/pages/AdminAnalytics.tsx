import { BarChart3, TrendingUp, Users, BookOpen } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AdminAnalytics = () => {
    return (
        <DashboardLayout role="admin" userName="Admin User">
            <div className="space-y-8 max-w-7xl mx-auto">
                <div>
                    <h1 className="text-3xl font-display font-bold">System Analytics</h1>
                    <p className="text-muted-foreground mt-1">Overview of system performance and usage</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                            <Users className="w-4 h-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">2,543</div>
                            <p className="text-xs text-muted-foreground">+12% from last month</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
                            <BookOpen className="w-4 h-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">48</div>
                            <p className="text-xs text-muted-foreground">+3 new this week</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Test Completion Rate</CardTitle>
                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">89.5%</div>
                            <p className="text-xs text-muted-foreground">+2.1% improvement</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="h-[300px] flex flex-col items-center justify-center text-muted-foreground border-dashed">
                        <BarChart3 className="w-12 h-12 mb-4 opacity-20" />
                        <p>User Activity Chart (Coming Soon)</p>
                    </Card>
                    <Card className="h-[300px] flex flex-col items-center justify-center text-muted-foreground border-dashed">
                        <BarChart3 className="w-12 h-12 mb-4 opacity-20" />
                        <p>Course Enrollment Stats (Coming Soon)</p>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminAnalytics;
