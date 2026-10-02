import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getCachedUser, getSession } from "@/lib/auth";

type Role = "student" | "teacher" | "admin";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles: Role[];
}

/**
 * The login token now lives in an HttpOnly cookie that JavaScript cannot read,
 * so the role comes from the backend (GET /users/me, cached) instead of being
 * decoded from a token in localStorage.
 */
const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
    const location = useLocation();
    const cached = getCachedUser();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(
        cached ? allowedRoles.includes(cached.role) : null
    );
    const [userRole, setUserRole] = useState<string | null>(cached?.role ?? null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const user = await getSession();
            if (cancelled) return;

            if (!user) {
                toast.error("Please login to access this page");
                setUserRole(null);
                setIsAuthorized(false);
                return;
            }

            setUserRole(user.role);

            if (!allowedRoles.includes(user.role)) {
                toast.error("You don't have permission to access this page");
                setIsAuthorized(false);
                return;
            }

            setIsAuthorized(true);
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname, allowedRoles.join(",")]);

    // Loading state
    if (isAuthorized === null) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Not authorized - redirect appropriately
    if (!isAuthorized) {
        // If they have a role but wrong permissions, redirect to their dashboard
        if (userRole === "admin") return <Navigate to="/admin" replace />;
        if (userRole === "teacher") return <Navigate to="/teacher" replace />;
        if (userRole === "student") return <Navigate to="/student" replace />;

        // Not logged in - redirect to login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
