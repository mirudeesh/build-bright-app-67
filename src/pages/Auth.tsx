import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import liquenoLogo from "@/assets/liqueno-logo.png";
import { z } from "zod";
import { Shield, Mail, ArrowLeft } from "lucide-react";

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const signupSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
  username: z.string().trim().min(3, { message: "Username must be at least 3 characters" }).max(20, { message: "Username must be less than 20 characters" }).optional(),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, sendOtp, verifyOtp, needsOtpVerification, otpVerified, setNeedsOtpVerification, signOut } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});

  // Signup form state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user && otpVerified) {
      navigate("/");
    }
  }, [user, otpVerified, navigate]);

  // Auto-send OTP when user needs verification
  useEffect(() => {
    if (needsOtpVerification && user && !otpSent) {
      handleSendOtp();
    }
  }, [needsOtpVerification, user]);

  const handleSendOtp = async () => {
    setIsLoading(true);
    const { error } = await sendOtp();
    setIsLoading(false);

    if (error) {
      toast({
        title: "Failed to send OTP",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setOtpSent(true);
      toast({
        title: "OTP Sent",
        description: "Check your email for the 6-digit code.",
      });
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit code.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { error, success } = await verifyOtp(otpCode);
    setIsLoading(false);

    if (error) {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    } else if (success) {
      toast({
        title: "Verified!",
        description: "Welcome to Liqueno!",
      });
      navigate("/");
    }
  };

  const handleBackToLogin = async () => {
    await signOut();
    setOtpCode("");
    setOtpSent(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrors({});

    try {
      const validated = loginSchema.parse({ email: loginEmail, password: loginPassword });
      setIsLoading(true);

      const { error, needsOtp } = await signIn(validated.email, validated.password);

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Login failed",
            description: "Invalid email or password. Please try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        }
      } else if (needsOtp) {
        toast({
          title: "Verification required",
          description: "We're sending a verification code to your email.",
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setLoginErrors(errors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupErrors({});

    try {
      const validated = signupSchema.parse({
        email: signupEmail,
        username: signupUsername,
        password: signupPassword,
        confirmPassword: confirmPassword,
      });
      
      setIsLoading(true);

      const { error } = await signUp(validated.email, validated.password, validated.username);

      if (error) {
        if (error.message.includes("User already registered")) {
          toast({
            title: "Signup failed",
            description: "An account with this email already exists. Please login instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Account created successfully! You can now login.",
        });
        // Clear form
        setSignupEmail("");
        setSignupUsername("");
        setSignupPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setSignupErrors(errors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Verification Screen
  if (needsOtpVerification && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src={liquenoLogo} alt="Liqueno logo" className="h-12 w-12 rounded-full" />
            <h1 className="text-3xl font-bold text-foreground">Liqueno</h1>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Verify Your Identity</CardTitle>
              <CardDescription>
                We've sent a 6-digit code to<br />
                <span className="font-medium text-foreground">{user.email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={(value) => setOtpCode(value)}
                  disabled={isLoading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button 
                onClick={handleVerifyOtp} 
                className="w-full" 
                disabled={isLoading || otpCode.length !== 6}
              >
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>

              <div className="flex flex-col gap-2 text-center">
                <Button
                  variant="ghost"
                  onClick={handleSendOtp}
                  disabled={isLoading}
                  className="text-sm"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Resend Code
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={handleBackToLogin}
                  disabled={isLoading}
                  className="text-sm text-muted-foreground"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                You can also verify by asking the AI: "verify my code [your-code]"
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src={liquenoLogo} alt="Liqueno logo" className="h-12 w-12 rounded-full" />
          <h1 className="text-3xl font-bold text-foreground">Liqueno</h1>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>Enter your credentials to access your account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      disabled={isLoading}
                    />
                    {loginErrors.email && (
                      <p className="text-sm text-destructive">{loginErrors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    {loginErrors.password && (
                      <p className="text-sm text-destructive">{loginErrors.password}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Sign Up</CardTitle>
                <CardDescription>Create a new account to get started</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      disabled={isLoading}
                    />
                    {signupErrors.email && (
                      <p className="text-sm text-destructive">{signupErrors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Username (optional)</Label>
                    <Input
                      id="signup-username"
                      type="text"
                      placeholder="cooluser123"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      disabled={isLoading}
                    />
                    {signupErrors.username && (
                      <p className="text-sm text-destructive">{signupErrors.username}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    {signupErrors.password && (
                      <p className="text-sm text-destructive">{signupErrors.password}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    {signupErrors.confirmPassword && (
                      <p className="text-sm text-destructive">{signupErrors.confirmPassword}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Sign Up"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;
