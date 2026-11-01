import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { ActivityIndicator } from 'react-native';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Tables } from '@/types/database.types';
import { getProfileById, upsertProfile } from '@/services/profile';

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  profile: Tables<'profiles'> | null | undefined;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  profile: null,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const existing = await getProfileById(user!.id);
      if (existing) return existing;
      // Profile row missing (e.g. after a migration wipe) — create it now
      return upsertProfile({
        id: user!.id,
        full_name: user!.user_metadata?.full_name ?? '',
        avatar_url: user!.user_metadata?.avatar_url ?? null,
        username: user!.user_metadata?.username ?? null,
      });
    },
    enabled: !!user,
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <View className='flex-1 items-center justify-center'>
        <ActivityIndicator size='large' />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, profile }}>
      {children}
    </AuthContext.Provider>
  );
};
