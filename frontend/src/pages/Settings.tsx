import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, User, Phone, Mail, Save, ShieldCheck, Camera } from 'lucide-react';

export default function Settings() {
  const { user, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    relationship_to_elderly: '',
    profile_picture: ''
  });

  // Load user data when the page opens
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        phone_number: user.phone_number || '',
        relationship_to_elderly: user.relationship_to_elderly || '',
        profile_picture: user.profile_picture || ''
      });
    }
  }, [user]);

  // Handle Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (limit to 2MB to prevent DB bloat)
      if (file.size > 2 * 1024 * 1024) {
        return setMessage('Image must be less than 2MB');
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profile_picture: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');

    try {
      await axios.put('http://localhost:8000/api/v1/auth/me', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await refreshUser(); // Update global context
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-100 via-slate-50 to-blue-50/30 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/dashboard')} className="p-2 bg-white/50 hover:bg-white/80 rounded-full transition-colors shadow-sm border border-white/60">
            <ArrowLeft className="text-slate-700 w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Account Settings</h1>
            <p className="text-slate-600 font-medium mt-1">Manage your personal information</p>
          </div>
        </div>

        <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-lg border border-white/60 p-8">
          
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center mb-8 pb-8 border-b border-white/60">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-5xl font-bold shadow-lg border-4 border-white/50">
                {formData.profile_picture ? (
                  <img src={formData.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user?.full_name ? user.full_name.charAt(0) : 'U'
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-white text-blue-600 p-2.5 rounded-full shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                title="Upload Profile Picture"
              >
                <Camera size={20} />
              </button>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
              />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mt-4">{user?.full_name}</h2>
            <p className="text-slate-500 flex items-center gap-2 mt-1"><Mail size={16}/> {user?.email}</p>
            <span className="inline-block mt-2 bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-blue-200">
              {user?.role}
            </span>
          </div>

          {message && (
            <div className={`p-4 rounded-xl mb-6 text-sm font-bold border ${message.includes('success') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 text-slate-400" size={20} />
                <input type="text" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 bg-white/60 border border-white/60 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-3.5 text-slate-400" size={20} />
                <input type="tel" value={formData.phone_number} onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 bg-white/60 border border-white/60 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all" placeholder="+8801700000000" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Relationship to Elderly</label>
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-3.5 text-slate-400" size={20} />
                <select value={formData.relationship_to_elderly} onChange={(e) => setFormData({...formData, relationship_to_elderly: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 bg-white/60 border border-white/60 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all appearance-none cursor-pointer">
                  <option value="Son">Son</option>
                  <option value="Daughter">Daughter</option>
                  <option value="Husband">Husband</option>
                  <option value="Wife">Wife</option>
                  <option value="Relative">Relative</option>
                  <option value="Neighbor">Neighbor</option>
                  <option value="Caregiver">Professional Caregiver</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={isSaving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2">
              <Save size={20} />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}