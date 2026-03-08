import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
    redirectPath?: string;
    allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    redirectPath = '/login',
    allowedRoles
}) => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr || userStr === 'undefined') {
        return <Navigate to={redirectPath} replace />;
    }

    let user;
    try {
        user = JSON.parse(userStr);
    } catch (e) {
        console.error("Failed to parse user session", e);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return <Navigate to={redirectPath} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
