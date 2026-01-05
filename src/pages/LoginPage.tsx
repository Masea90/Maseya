import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Lock, Eye, EyeOff, UserPlus, LogIn, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, signUp, allUsers } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showSwitchAccount, setShowSwitchAccount] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (isSignUp) {
      const result = signUp(email, password);
      if (result.success) {
        toast.success('Account created! Welcome aboard 🌿');
        navigate('/');
      } else {
        toast.error(result.error || 'Sign up failed');
      }
    } else {
      const result = login(email, password);
      if (result.success) {
        toast.success('Welcome back! 🌿');
        navigate('/');
      } else {
        toast.error(result.error || 'Login failed');
      }
    }
  };

  const handleQuickLogin = (userEmail: string) => {
    setEmail(userEmail);
    setShowSwitchAccount(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-6 pt-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🌿</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Maseya
          </h1>
          <p className="text-muted-foreground mt-1">Your glow journey awaits</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 animate-fade-in">
        <div className="mb-6">
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-muted-foreground">
            {isSignUp 
              ? 'Start your personalized skincare journey' 
              : 'Sign in to continue your glow journey'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-12 pl-12 rounded-2xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={isSignUp ? 'Min 6 characters' : '••••••••'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-12 pl-12 pr-12 rounded-2xl"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Eye className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-14 rounded-2xl text-lg font-medium bg-gradient-olive"
          >
            {isSignUp ? (
              <>
                <UserPlus className="w-5 h-5 mr-2" />
                Create Account
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Sign In
              </>
            )}
          </Button>
        </form>

        {/* Switch Account */}
        {allUsers.length > 0 && !isSignUp && (
          <div className="mt-6">
            <button
              onClick={() => setShowSwitchAccount(!showSwitchAccount)}
              className="w-full flex items-center justify-center gap-2 text-sm text-primary font-medium"
            >
              <Users className="w-4 h-4" />
              Switch Account
            </button>
            
            {showSwitchAccount && (
              <div className="mt-3 bg-card rounded-2xl border border-border overflow-hidden">
                {allUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleQuickLogin(user.email)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors border-b border-border last:border-b-0"
                  >
                    <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-lg">
                      👤
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">{user.email.split('@')[0]}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary font-medium"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
