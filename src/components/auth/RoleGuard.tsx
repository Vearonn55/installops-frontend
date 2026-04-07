import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import type { UserRole } from '../../types';


interface RoleGuardProps {
  children: React.ReactNode;
  roles: UserRole[];
}

export default function RoleGuard({ children, roles }: RoleGuardProps) {
  const { user, hasAnyRole } = useAuthStore();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }
  if (user.role === 'ADMIN') {
    return <>{children}</>;
  }

  if (!hasAnyRole(roles)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}

