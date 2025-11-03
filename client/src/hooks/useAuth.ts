import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  companyId: string | null;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    companyId: null,
    loading: true
  });

        useEffect(() => {
          let isMounted = true;
    
    // Set timeout for auth check (5 seconds)
    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
      if (isMounted) {
        setAuthState({
          user: null,
          companyId: null,
          loading: false
        });
      }
    }, 5000);

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        clearTimeout(timeoutId);
        if (!isMounted) return;
        
        if (error) {
          console.error('Auth error:', error);
          setAuthState({
            user: null,
            companyId: null,
            loading: false
          });
          return;
        }

        const user = session?.user ?? null;
        const companyId = user?.user_metadata?.company_id ?? null;
        setAuthState({
          user,
          companyId,
          loading: false
        });
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        console.error('Auth check failed:', error);
        if (isMounted) {
          setAuthState({
            user: null,
            companyId: null,
            loading: false
          });
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      const user = session?.user ?? null;
      const companyId = user?.user_metadata?.company_id ?? null;
      setAuthState({
        user,
        companyId,
        loading: false
      });
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  return authState;
}
