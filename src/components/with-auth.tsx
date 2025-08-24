
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import type { UserProfile } from '@/context/auth-context';

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

    if (loading || !user || (allowedRoles && !allowedRoles.includes(user.role))) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };

  AuthComponent.displayName = `WithAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return AuthComponent;
};

export default withAuth;
