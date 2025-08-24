
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import type { UserProfile } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';

type Role = UserProfile['role'];

const withAuth = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  allowedRoles?: Role[]
) => {
  const AuthComponent = (props: P) => {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (loading) {
        return; // Do nothing while loading
      }

      if (!user) {
        router.push('/login');
        return;
      }
      
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        router.push('/'); // Redirect to a safe page if role not allowed
      }

    }, [user, loading, router, allowedRoles]);

    if (loading) {
      return (
        <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
    }

    if (!user) {
        return null; // Or a fallback component for unauthenticated users
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return null; // Or a fallback component for unauthorized users
    }

    return <WrappedComponent {...props} />;
  };

  AuthComponent.displayName = `WithAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return AuthComponent;
};

export default withAuth;

    