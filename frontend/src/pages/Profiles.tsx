import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { ArrowLeft, User, Activity, ChevronRight, ShieldCheck, HeartPulse, Wifi, WifiOff, AlertCircle, Phone, Calendar } from 'lucide-react';

interface ElderlyProfile {
  id: number;
  name: string;
  age: number;
  medical_notes: string | null;
}

export default function Profiles() {
  const navigate = useNavigate();
  
  const { data: profiles, isLoading, isError } = useQuery({
    queryKey: ['elderlyProfiles'],
    queryFn: async () => {
      const response = await apiClient.get('/elderly/');
      return response.data as ElderlyProfile[];
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-100 via-slate-50 to-blue-50/30 flex items-center justify-center">
        <HeartPulse className="w-12 h-12 text-blue-600 animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-100 via-slate-50 to-blue-50/30 flex items-center justify-center text-red-600">
        <p>Error loading profiles. Please log in again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-100 via-slate-50 to-blue-50/30 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/dashboard')} className="p-2 bg-white/50 hover:bg-white/80 rounded-full transition-colors shadow-sm border border-white/60">
            <ArrowLeft className="text-slate-700 w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Care Directory</h1>
            <p className="text-slate-600 font-medium mt-1">Manage and monitor your loved ones</p>
          </div>
          <div className="ml-auto bg-white/40 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/60 shadow-sm text-sm font-bold text-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            {profiles?.length || 0} Profiles Monitored
          </div>
        </div>

        {/* Profile Cards Grid */}
        {profiles?.length === 0 ? (
          <div className="bg-white/40 backdrop-blur-xl p-12 text-center rounded-3xl border-2 border-dashed border-white/60 text-slate-600 shadow-sm">
            No elderly profiles found. Create one via the API docs first!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles?.map((profile) => (
              <div key={profile.id} className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-lg shadow-slate-200/50 border border-white/60 overflow-hidden hover:bg-white/60 hover:-translate-y-1 transition-all duration-300 group">
                <div className="p-6">
                  
                  {/* Profile Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform border border-white/20">
                      {profile.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-800">{profile.name}</h3>
                      <p className="text-sm text-slate-600 font-medium mt-1 flex items-center gap-1.5">
                        <User size={14} /> {profile.age} years old
                      </p>
                    </div>
                  </div>

                  {/* Medical Notes */}
                  <div className="bg-white/50 rounded-xl p-4 mb-6 border border-white/60">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Medical Notes</p>
                    <p className="text-sm text-slate-700 font-medium line-clamp-2 min-h-[40px]">
                      {profile.medical_notes || 'No specific medical notes recorded.'}
                    </p>
                  </div>

                  {/* Live Status Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-white/50 rounded-xl p-3 border border-white/60 flex items-center gap-2">
                      <div className="bg-green-500/20 p-1.5 rounded-lg">
                        <ShieldCheck className="text-green-600 w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Status</p>
                        <p className="text-xs font-bold text-green-600">Normal</p>
                      </div>
                    </div>
                    <div className="bg-white/50 rounded-xl p-3 border border-white/60 flex items-center gap-2">
                      <div className="bg-blue-500/20 p-1.5 rounded-lg">
                        <Wifi className="text-blue-600 w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Device</p>
                        <p className="text-xs font-bold text-blue-600">Connected</p>
                      </div>
                    </div>
                    <div className="bg-white/50 rounded-xl p-3 border border-white/60 flex items-center gap-2">
                      <div className="bg-red-500/20 p-1.5 rounded-lg">
                        <HeartPulse className="text-red-600 w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Heart Rate</p>
                        <p className="text-xs font-bold text-red-600">-- BPM</p>
                      </div>
                    </div>
                    <div className="bg-white/50 rounded-xl p-3 border border-white/60 flex items-center gap-2">
                      <div className="bg-cyan-500/20 p-1.5 rounded-lg">
                        <Activity className="text-cyan-600 w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">SpO2</p>
                        <p className="text-xs font-bold text-cyan-600">--%</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button 
                      onClick={() => navigate(`/profile/${profile.id}`)}
                      className="w-full bg-slate-900/90 hover:bg-slate-900 text-white py-3 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 group-hover:shadow-lg"
                    >
                      <Activity size={18} />
                      Open Live Monitoring
                      <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                      className="w-full bg-white/50 hover:bg-white/80 text-slate-700 py-2 rounded-xl font-semibold transition-all border border-white/60 text-sm"
                    >
                      View Full Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}