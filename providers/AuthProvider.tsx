import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Tables } from '@/types/database.types';
import { getProfileById, upsertProfile } from '@/services/profile';
import AnimatedSplash from '@/components/AnimatedSplash';

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
  // splashDone: true once the animated splash has finished playing
  const [splashDone, setSplashDone] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const existing = await getProfileById(user!.id);
      if (existing) return existing;
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

  // Show the animated splash until:
  //   a) auth has resolved (isLoading = false)  AND
  //   b) the splash animation has finished (splashDone = true)
  // The splash plays immediately on mount so there's no delay.
  if (!splashDone || isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Render children underneath so they're ready when splash fades out */}
        {!isLoading && (
          <View style={{ flex: 1 }}>
            <AuthContext.Provider value={{ user, isAuthenticated, profile: profile ?? null }}>
              {children}
            </AuthContext.Provider>
          </View>
        )}
        {/* Splash always renders on top until animation completes */}
        {!splashDone && (
          <AnimatedSplash onFinished={() => setSplashDone(true)} />
        )}
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, profile: profile ?? null }}>
      {children}
    </AuthContext.Provider>
  );
};
