import { Settings, Save } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const AdminSettings = () => {
    const handleSave = () => {
        toast.success("Settings saved successfully");
    };

    return (
        <DashboardLayout role="admin" userName="Admin User">
            <div className="space-y-8 max-w-4xl mx-auto">
                <div>
                    <h1 className="text-3xl font-display font-bold">System Settings</h1>
                    <p className="text-muted-foreground mt-1">Configure global application preferences</p>
                </div>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>General Configuration</CardTitle>
                            <CardDescription>Basic system information and display settings</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label>School Name</Label>
                                <Input defaultValue="KolaDaisi University" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Support Email</Label>
                                <Input defaultValue="support@kdu.edu.ng" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Features & Permissions</CardTitle>
                            <CardDescription>Control system access and modules</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Allow New Registrations</Label>
                                    <p className="text-sm text-muted-foreground">Toggle open signup for students and teachers</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Maintenance Mode</Label>
                                    <p className="text-sm text-muted-foreground">Temporarily disable access for non-admin users</p>
                                </div>
                                <Switch />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Enable Beta Features</Label>
                                    <p className="text-sm text-muted-foreground">Access to experimental tools</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button onClick={handleSave} className="gap-2">
                            <Save className="w-4 h-4" /> Save Changes
                        </Button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminSettings;
