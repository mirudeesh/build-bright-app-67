import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, username?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any; needsOtp?: boolean }>;
  signOut: () => Promise<void>;
  sendOtp: () => Promise<{ error: any }>;
  verifyOtp: (code: string) => Promise<{ error: any; success?: boolean }>;
  loading: boolean;
  otpVerified: boolean;
  needsOtpVerification: boolean;
  setNeedsOtpVerification: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [otpVerified, setOtpVerified] = useState(false);
  const [needsOtpVerification, setNeedsOtpVerification] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Reset OTP state on sign out
        if (event === 'SIGNED_OUT') {
          setOtpVerified(false);
          setNeedsOtpVerification(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username: username || email.split('@')[0],
        }
      }
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error) {
      // Login successful, now need OTP verification
      setNeedsOtpVerification(true);
      setOtpVerified(false);
      return { error: null, needsOtp: true };
    }
    
    return { error };
  };

  const sendOtp = async () => {
    if (!session?.access_token) {
      return { error: { message: 'No active session' } };
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { error: { message: data.error || 'Failed to send OTP' } };
      }

      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message || 'Failed to send OTP' } };
    }
  };

  const verifyOtp = async (code: string) => {
    if (!session?.access_token) {
      return { error: { message: 'No active session' } };
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-otp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { error: { message: data.error || 'Invalid code' } };
      }

      setOtpVerified(true);
      setNeedsOtpVerification(false);
      return { error: null, success: true };
    } catch (error: any) {
      return { error: { message: error.message || 'Failed to verify OTP' } };
    }
  };

  const signOut = async () => {
    setOtpVerified(false);
    setNeedsOtpVerification(false);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      signUp, 
      signIn, 
      signOut, 
      sendOtp,
      verifyOtp,
      loading,
      otpVerified,
      needsOtpVerification,
      setNeedsOtpVerification
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
