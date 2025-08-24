
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
      if (!loading && !user) {
        router.push('/login');
      } else if (!loading && user && allowedRoles && !allowedRoles.includes(user.role)) {
        router.push('/'); // Or a dedicated "unauthorized" page
      }
    }, [user, loading, router, allowedRoles]);

    if (loading) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
      );
    }
    
    if (!user || (allowedRoles && !allowedRoles.includes(user.role))) {
      return null; // or a loading spinner, but this prevents flashing the component
    }

    return <WrappedComponent {...props} />;
  };

  AuthComponent.displayName = `WithAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return AuthComponent;
};

export default withAuth;
