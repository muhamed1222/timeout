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
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      const companyId = user?.user_metadata?.company_id ?? null;
      setAuthState({
        user,
        companyId,
        loading: false
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      const companyId = user?.user_metadata?.company_id ?? null;
      setAuthState({
        user,
        companyId,
        loading: false
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  return authState;
}
