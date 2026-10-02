import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/context/ThemeContext"
import Index from "./pages/Index";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/ProtectedRoute";
import StudentCourses from "./pages/StudentCourses";
import StudentAssignments from "./pages/StudentAssignments";
import StudentWarnings from "./pages/StudentWarnings";
import StudentProfile from "./pages/StudentProfile";
import StudentTest from "./pages/StudentTest";
import StudentEnrollment from "./pages/StudentEnrollment";
import TeacherCourses from "./pages/TeacherCourses";
import TeacherMaterials from "./pages/TeacherMaterials";
import TeacherGrading from "./pages/TeacherGrading";
import TeacherAssignments from "./pages/TeacherAssignments";
import TeacherEnrollments from "./pages/TeacherEnrollment";
import TeacherTests from "./pages/TeacherTests";
import AdminUsers from "./pages/AdminUsers";
import AdminCourses from "./pages/AdminCourses";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminWarning from "./pages/AdminWarnings";
import AdminTests from "./pages/AdminTests";
import AdminSettings from "./pages/AdminSettings";


const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route
              path="/student/*"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <Routes>
                    <Route path="/" element={<StudentDashboard />} />
                    <Route path="/courses" element={<StudentCourses />} />
                    <Route path="/assignments" element={<StudentAssignments />} />

                    <Route path="/profile" element={<StudentProfile />} />
                    <Route path="/test" element={<StudentTest />} />
                    <Route path="/enrollment" element={<StudentEnrollment />} />
                    <Route path="/warnings" element={<StudentWarnings />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/*"
              element={
                <ProtectedRoute allowedRoles={["teacher"]}>
                  <Routes>
                    <Route path="/" element={<TeacherDashboard />} />
                    <Route path="/courses" element={<TeacherCourses />} />
                    <Route path="/materials" element={<TeacherMaterials />} />
                    <Route path="/enrollments" element={<TeacherEnrollments />} />
                    <Route path="/grading" element={<TeacherGrading />} />
                    <Route path="/assignments" element={<TeacherAssignments />} />
                    <Route path="/tests" element={<TeacherTests />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Routes>
                    <Route path="/" element={<AdminDashboard />} />
                    <Route path="/users" element={<AdminUsers />} />
                    <Route path="/courses" element={<AdminCourses />} />
                    <Route path="/analytics" element={<AdminAnalytics />} />
                    <Route path="/warnings" element={<AdminWarning />} />
                    <Route path="/tests" element={<AdminTests />} />
                    <Route path="/settings" element={<AdminSettings />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ProtectedRoute>
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;