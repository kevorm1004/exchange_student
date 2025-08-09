import { useEffect } from 'react';
import { useAuth } from './use-auth';
import { useLocation } from 'wouter';

export function useRequireAuth() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth/login');
    }
  }, [user, isLoading, navigate]);

  return { user, isLoading };
}