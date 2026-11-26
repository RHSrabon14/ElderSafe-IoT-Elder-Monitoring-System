import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Added Link here
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, HeartPulse, Lock, Mail } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await axios.post('http://localhost:8000/api/v1/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      login(response.data.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      
      {/* --- MOBILE ONLY: Top Branding Bar --- */}
      <div className="lg:hidden bg-linear-to-r from-blue-700 to-indigo-800 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="flex items-center gap-2 text-white mb-2 relative z-10">
          <ShieldCheck className="w-8 h-8" />
          <h1 className="text-2xl font-bold tracking-tight">ElderCare Guardian</h1>
        </div>
        
        {/* Mini ECG Animation for Mobile */}
        <div className="w-48 h-8 mt-2 relative overflow-hidden">
          <svg viewBox="0 0 200 50" className="w-full h-full stroke-green-400 stroke-[3px] fill-none" preserveAspectRatio="none">
            <path 
              className="ecg-line"
              d="M0,25 L40,25 L50,10 L60,40 L70,25 L100,25 L110,5 L120,45 L130,25 L200,25" 
            />
          </svg>
        </div>
      </div>

      {/* --- DESKTOP ONLY: Left Branding Panel --- */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-blue-700 via-blue-600 to-indigo-900 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2 animate-float"></div>
        <div className="absolute bottom-0 right-0 w-125 h-125 bg-blue-400 opacity-10 rounded-full translate-x-1/3 translate-y-1/3 animate-float-delayed"></div>
        
        <div className="relative z-10 animate-fade-in-up">
          <div className="flex items-center gap-3 text-white mb-8">
            <ShieldCheck className="w-12 h-12" />
            <h1 className="text-4xl font-extrabold tracking-tight">ElderCare Guardian</h1>
          </div>
          <p className="text-blue-100 text-xl max-w-md leading-relaxed font-light">
            Providing peace of mind through continuous, real-time safety monitoring for your loved ones. 
          </p>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center my-auto w-full">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-blue-400 rounded-full blur-2xl opacity-40 animate-pulse"></div>
            <div className="bg-white/10 backdrop-blur-md p-8 rounded-full shadow-2xl border border-white/20 relative z-10 animate-float">
              <HeartPulse className="w-16 h-16 text-white" />
            </div>
          </div>
          <div className="w-full max-w-lg h-32 relative overflow-hidden flex items-center">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            <svg viewBox="0 0 500 100" className="w-full h-full relative z-10" preserveAspectRatio="none">
              <path className="ecg-line stroke-green-400 stroke-[3px] fill-none" d="M0,50 L80,50 L100,50 L110,20 L130,80 L140,50 L160,50 L180,50 L190,10 L210,90 L220,50 L250,50 L270,50 L280,30 L300,70 L310,50 L330,50 L360,50 L370,15 L390,85 L400,50 L430,50 L500,50" />
            </svg>
          </div>
          <p className="text-green-400 font-bold mt-4 tracking-[0.2em] uppercase text-sm animate-pulse flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
            Live Health Monitoring
          </p>
        </div>

        <div className="relative z-10 animate-fade-in-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-2xl border border-white/20 max-w-sm shadow-2xl">
            <div className="flex items-center gap-4 mb-3">
              <div className="bg-green-400/20 p-2 rounded-full relative">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-pulse-fast"></span>
                <HeartPulse className="w-6 h-6 text-green-300 relative z-10" />
              </div>
              <div>
                <p className="text-white font-semibold">System Active</p>
                <p className="text-blue-200 text-sm">Monitoring 24/7</p>
              </div>
            </div>
            <p className="text-blue-100 text-sm leading-relaxed italic border-l-2 border-blue-300 pl-3 mt-4">
              "Thanks to ElderCare Guardian, I can check on my father's health and safety from anywhere in the world."
            </p>
          </div>
        </div>
      </div>

      {/* --- Right Side (or Mobile Bottom): Login Form --- */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-8 relative">
        <div className="w-full max-w-md relative z-10 animate-fade-in-up" style={{ animationDelay: '0.3s', opacity: 0 }}>
          <div className="text-center mb-8 lg:mb-10 mt-6 lg:mt-0">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-500 font-medium">Sign in to your caregiver dashboard</p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 text-sm flex items-center shadow-sm animate-fade-in-up">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all outline-none shadow-sm hover:border-blue-300 text-base"
                  placeholder="caregiver@example.com"
                  required 
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all outline-none shadow-sm hover:border-blue-300 text-base"
                  placeholder="••••••••"
                  required 
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer" />
                <label className="ml-2 block text-sm text-gray-600 cursor-pointer">Remember me</label>
              </div>
              <a href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-500 transition-colors">
                Forgot password?
              </a>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/30 text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:-translate-y-0.5 ${isLoading ? 'opacity-70 cursor-not-allowed transform-none' : ''}`}
            >
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Registration Link */}
          <p className="mt-8 text-center text-sm text-gray-600 font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-blue-600 hover:text-blue-500 transition-colors">
              Create an Account
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}