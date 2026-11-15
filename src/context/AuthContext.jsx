
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  supabase,
  isSupabaseConfigured,
} from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let alive = true;

    async function initializeSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;
        if (!alive) return;

        setSession(data.session);

        if (data.session) {
          await loadProfile(data.session.user.id);
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
      } finally {
        if (alive) setLoading(false);
      }
    }

    initializeSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (!nextSession) {
        setProfile(null);
        setLoading(false);
      } else {
        setLoading(true);

        setTimeout(() => {
          loadProfile(nextSession.user.id).catch((error) => {
            console.error('Failed to load user profile:', error);
            setLoading(false);
          });
        }, 0);
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(id) {
    if (!supabase) {
      setProfile(null);
      setLoading(false);
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Failed to load profile:', error);
      setProfile(null);
      setLoading(false);
      throw error;
    }

    setProfile(data || null);
    setLoading(false);

    return data;
  }

  async function signIn(email, password) {
    if (!supabase) {
      throw new Error(
        'Supabase is not configured. Follow the README setup steps first.'
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    await loadProfile(data.user.id);

    return data;
  }

  async function signOut() {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }

    setSession(null);
    setProfile(null);
  }

  const value = {
    session,
    user: session?.user || null,
    profile,
    loading,
    isAdmin:
      profile?.role === 'admin' ||
      profile?.role === 'super_admin',
    signIn,
    signOut,
    refreshProfile: () =>
      session ? loadProfile(session.user.id) : Promise.resolve(null),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
