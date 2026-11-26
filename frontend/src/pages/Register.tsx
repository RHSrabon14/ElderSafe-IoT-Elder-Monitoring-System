import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, Mail, Lock, User, Phone, CheckCircle, Users, AlertCircle } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirmPassword: '',
    role: 'caregiver',
    relationship_to_elderly: 'Son',
    terms_accepted: false
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Password Match Check
    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match");
    }

    // 2. Terms Check
    if (!formData.terms_accepted) {
      return setError("You must accept the terms and privacy policy");
    }

    // 3. Phone Number Format Check (Frontend)
    if (formData.phone_number) {
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      // Clean the string (remove spaces/dashes) before checking
      const cleanPhone = formData.phone_number.replace(/[\s\-\(\)]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        return setError("Invalid phone number. Please use 10-15 digits (e.g., +8801700000000).");
      }
    }

    setIsLoading(true);
    try {
      await axios.post('http://localhost:8000/api/v1/auth/register', {
        full_name: formData.full_name,
        email: formData.email,
        phone_number: formData.phone_number,
        password: formData.password,
        role: formData.role,
        relationship_to_elderly: formData.relationship_to_elderly,
        terms_accepted: formData.terms_accepted
      });
      navigate('/login');
    } catch (err: any) {
      // Show backend error (e.g., "Email already exists")
      const errorMessage = err.response?.data?.detail 
        ? (Array.isArray(err.response.data.detail) ? err.response.data.detail[0].msg : err.response.data.detail)
        : 'Registration failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-100 via-slate-50 to-blue-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white/40 backdrop-blur-xl rounded-3xl shadow-xl border border-white/60 p-8 my-8">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800">Create Account</h2>
          <p className="text-slate-500 font-medium mt-2">Join ElderCare Guardian</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 text-sm font-medium flex items-start gap-2">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <User className="absolute left-4 top-3.5 text-slate-400" size={20} />
              <input type="text" name="full_name" placeholder="Full Name" required value={formData.full_name} onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all" />
            </div>

            <div className="relative">
              <Phone className="absolute left-4 top-3.5 text-slate-400" size={20} />
              <input type="tel" name="phone_number" placeholder="Phone Number (e.g., +8801...)" value={formData.phone_number} onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all" />
            </div>
          </div>

          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input type="email" name="email" placeholder="Email Address" required value={formData.email} onChange={handleChange}
              className="w-full pl-12 pr-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all" />
          </div>

          {/* Relationship Dropdown */}
          <div className="relative">
            <Users className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <select name="relationship_to_elderly" value={formData.relationship_to_elderly} onChange={handleChange}
              className="w-full pl-12 pr-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all appearance-none cursor-pointer">
              <option value="Son">Son</option>
              <option value="Daughter">Daughter</option>
              <option value="Husband">Husband</option>
              <option value="Wife">Wife</option>
              <option value="Relative">Relative</option>
              <option value="Neighbor">Neighbor</option>
              <option value="Caregiver">Professional Caregiver</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-slate-400" size={20} />
              <input type="password" name="password" placeholder="Password" required value={formData.password} onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all" />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-slate-400" size={20} />
              <input type="password" name="confirmPassword" placeholder="Confirm Password" required value={formData.confirmPassword} onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all" />
            </div>
          </div>

          <div className="flex items-start gap-3 pt-2">
            <input type="checkbox" name="terms_accepted" id="terms" checked={formData.terms_accepted} onChange={handleChange}
              className="w-5 h-5 mt-0.5 text-blue-600 rounded border-white/60 bg-white/50 focus:ring-blue-500 cursor-pointer" />
            <label htmlFor="terms" className="text-sm font-medium text-slate-700 leading-tight cursor-pointer">
              I agree to the <a href="#" className="text-blue-600 font-bold hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 font-bold hover:underline">Privacy Policy</a>
            </label>
          </div>

          <button type="submit" disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 mt-6">
            {isLoading ? 'Creating Account...' : <><CheckCircle size={20} /> Create Account</>}
          </button>
        </form>

        <p className="text-center text-slate-600 font-medium mt-6">
          Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}