import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { 
  LogOut, Activity, AlertTriangle, ShieldCheck, User, Clock, 
  HeartPulse, Calendar, ChevronRight, Menu, X, Settings, ShieldAlert, Bell,
  PhoneCall, MessageSquare
} from 'lucide-react';

interface ElderlyProfile {
  id: number;
  name: string;
  age: number;
  medical_notes: string | null;
}

export default function Dashboard() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  // State for the Live Alert Popup
  const [liveToast, setLiveToast] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: profiles, isLoading, isError } = useQuery({
    queryKey: ['elderlyProfiles'],
    queryFn: async () => {
      const response = await apiClient.get('/elderly/');
      return response.data as ElderlyProfile[];
    },
  });

  // Fetch ALL emergencies to calculate real stats
  const { data: allEmergencies } = useQuery({
    queryKey: ['allEmergencies'],
    queryFn: async () => {
      const promises = profiles?.map((p: any) => apiClient.get(`/emergency/history/${p.id}`));
      if (!promises) return [];
      const results = await Promise.all(promises);
      return results.flatMap(res => res.data); 
    },
    enabled: !!profiles,
    refetchInterval: 5000, 
  });

  // --- LIVE ALERT POPUP LOGIC ---
  // We track the latest emergency ID to know when a NEW one appears
  const [lastSeenAlertId, setLastSeenAlertId] = useState<number>(0);

  useEffect(() => {
    if (allEmergencies && allEmergencies.length > 0) {
      // Find the most recent emergency
      const latest = [...allEmergencies].sort((a,b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      // If it's ACTIVE and we haven't shown it yet, show the popup
      if (latest.status === 'ACTIVE' && latest.id !== lastSeenAlertId) {
        setLiveToast(latest);
        setLastSeenAlertId(latest.id);
        
        // Auto-hide the popup after 8 seconds
        setTimeout(() => {
          setLiveToast(null);
        }, 8000);
      }
    }
  }, [allEmergencies, lastSeenAlertId]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <HeartPulse className="w-12 h-12 text-blue-600 animate-pulse mb-4" />
        <p className="text-xl font-medium text-slate-600">Connecting to monitoring service...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-red-600">
        <AlertTriangle className="w-12 h-12 mb-4" />
        <p className="text-xl font-bold mb-4">Error loading data. Please log in again.</p>
        <button onClick={() => navigate('/login')} className="bg-blue-600 text-white px-6 py-2 rounded-lg">
          Go to Login
        </button>
      </div>
    );
  }

  // --- REAL-TIME STATS CALCULATIONS ---
  const activeEmergencies = allEmergencies?.filter((ev: any) => ev.status === 'ACTIVE' && ev.severity === 'EMERGENCY') || [];
  const activeWarnings = allEmergencies?.filter((ev: any) => ev.status === 'ACTIVE' && ev.severity === 'WARNING') || [];
  
  const safeProfilesCount = profiles?.filter(p => {
    const profileAlerts = activeEmergencies.filter((ev: any) => ev.elderly_id === p.id);
    return profileAlerts.length === 0;
  }).length || 0;

  const formattedDate = currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formattedTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const getGreeting = () => {
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth();
    const date = now.getDate();
    const name = user?.full_name?.split(' ')[0] || 'Caregiver';

    if (month === 2 && date >= 30) return `Eid Mubarak, ${name}!`;
    if (month === 5 && (date >= 6 && date <= 7)) return `Eid Mubarak, ${name}!`;
    if (month === 9 && (date >= 1 && date <= 4)) return `Happy Durga Puja, ${name}!`;
    if (month === 3 && date === 14) return `Shubho Noboborsho, ${name}!`;

    if (hour < 12) return `Good Morning, ${name}`;
    if (hour >= 12 && hour < 17) return `Good Afternoon, ${name}`;
    if (hour >= 17 && hour < 21) return `Good Evening, ${name}`;
    return `Good Night, ${name}`;
  };

  return (
    <div className="min-h-screen flex font-sans bg-linear-to-br from-slate-100 via-slate-50 to-blue-50/30">
      
      {/* --- LIVE ALERT TOAST POPUP --- */}
      {liveToast && (
        <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-right-8 fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl border-l-4 border-red-600 w-96 overflow-hidden">
            <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex justify-between items-center">
              <div className="flex items-center gap-2 text-red-700 font-bold">
                <AlertTriangle size={18} className="animate-pulse" />
                EMERGENCY DETECTED
              </div>
              <button onClick={() => setLiveToast(null)} className="text-red-400 hover:text-red-600">
                <X size={16} />
              </button>
            </div>
            <div className="p-4">
              <p className="font-extrabold text-lg text-slate-800 mb-1">
                {liveToast.event_type.replaceAll('_', ' ')}
              </p>
              <p className="text-sm text-slate-600 mb-4">{liveToast.description}</p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-100 p-2 rounded-lg">
                  <PhoneCall size={16} className="text-red-600" />
                  Alarm Call Initiated to Caregivers
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-100 p-2 rounded-lg">
                  <MessageSquare size={16} className="text-blue-600" />
                  SMS Alert Sent to Primary Contacts
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 text-right">
              <button 
                onClick={() => { setLiveToast(null); navigate('/emergency-log'); }}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DESKTOP SIDEBAR (Dark Glass) --- */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900/90 backdrop-blur-xl text-slate-300 h-screen sticky top-0 shadow-2xl z-40 border-r border-slate-700/50">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-900/50">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">ElderCare</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          <button onClick={() => navigate('/dashboard')} className="w-full flex items-center gap-3 bg-blue-600/20 text-blue-400 px-4 py-3 rounded-xl font-semibold transition-all border border-blue-500/30">
            <Activity size={20} /> Dashboard
          </button>
          <button onClick={() => navigate('/profiles')} className="w-full flex items-center gap-3 hover:bg-white/5 hover:text-white px-4 py-3 rounded-xl font-medium transition-all text-slate-400">
            <User size={20} /> Profiles
          </button>
          <button onClick={() => navigate('/emergency-log')} className="w-full flex items-center gap-3 hover:bg-white/5 hover:text-white px-4 py-3 rounded-xl font-medium transition-all text-slate-400">
            <AlertTriangle size={20} /> Emergency Log
          </button>
          
          {user?.role === 'admin' && (
            <button onClick={() => navigate('/admin')} className="w-full flex items-center gap-3 hover:bg-red-500/10 hover:text-red-400 px-4 py-3 rounded-xl font-medium transition-all text-slate-400 border border-transparent hover:border-red-500/20 mt-4">
              <ShieldAlert size={20} /> Admin Portal
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800/50 space-y-2">
          <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg border border-white/20 overflow-hidden">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.full_name ? user.full_name.charAt(0) : 'U'
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-semibold text-sm truncate">{user?.full_name || 'Loading...'}</p>
              <p className="text-slate-400 text-xs truncate">{user?.relationship_to_elderly || 'Caregiver'}</p>
            </div>
          </div>

          <button onClick={() => navigate('/settings')} className="flex w-full items-center gap-3 hover:bg-white/5 hover:text-white px-4 py-3 rounded-xl font-medium transition-all text-slate-400">
            <Settings size={20} /> Settings
          </button>
          <button onClick={handleLogout} className="flex w-full items-center gap-3 hover:bg-red-500/10 hover:text-red-400 px-4 py-3 rounded-xl font-medium transition-all text-slate-400">
            <LogOut size={20} /> Sign Out
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-h-screen">
        
        <header className="bg-white/40 backdrop-blur-xl border-b border-white/60 px-4 md:px-8 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-slate-700" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight hidden md:block">Overview</h2>
              <p className="text-sm text-slate-600 font-medium hidden md:block">Monitor your loved ones in real-time</p>
            </div>
            <div className="md:hidden flex items-center gap-2">
               <ShieldCheck className="text-blue-600 w-6 h-6" />
               <h1 className="text-lg font-bold text-slate-800">ElderCare</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4 md:gap-8">
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 text-slate-600 hover:bg-slate-200/50 rounded-full transition relative"
              >
                <Bell size={24} />
                {(activeEmergencies.length + activeWarnings.length) > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white">
                    {activeEmergencies.length + activeWarnings.length}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Active Alerts</h3>
                    <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{activeEmergencies.length + activeWarnings.length}</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {(activeEmergencies.length + activeWarnings.length) === 0 ? (
                      <p className="p-4 text-center text-slate-500 text-sm">No active alerts right now.</p>
                    ) : (
                      [...activeEmergencies, ...activeWarnings].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((alert: any) => (
                        <div key={alert.id} className="p-4 border-b border-slate-100 hover:bg-slate-50 transition">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle size={16} className={alert.severity === 'EMERGENCY' ? 'text-red-500' : 'text-yellow-500'} />
                            <p className="font-bold text-sm text-slate-800">{alert.event_type.replace('_', ' ')}</p>
                          </div>
                          <p className="text-xs text-slate-500 mb-1">{alert.description}</p>
                          <p className="text-[10px] text-slate-400">{new Date(alert.created_at).toLocaleString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-2 bg-slate-50 border-t border-slate-200 text-center">
                    <button onClick={() => { setIsNotificationsOpen(false); navigate('/emergency-log'); }} className="text-xs font-bold text-blue-600 hover:underline">
                      View All Emergencies
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden sm:flex flex-col items-end">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm">
                <Clock size={16} className="text-blue-600" />
                <span>{formattedTime}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                <Calendar size={14} />
                <span>{formattedDate}</span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-400/30 hidden sm:block"></div>

            <div className="md:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                {user?.profile_picture ? (
                  <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user?.full_name ? user.full_name.charAt(0) : 'U'
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          
          <div className="bg-linear-to-r from-blue-600/90 via-indigo-600/90 to-purple-600/90 backdrop-blur-md rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-500/20 mb-8 relative overflow-hidden border border-white/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-20 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-extrabold mb-2">{getGreeting()}</h2>
              <p className="text-blue-100 max-w-lg mb-6 font-medium">Your system is actively monitoring the health and safety of your loved ones. Everything is running smoothly.</p>
              <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm font-bold backdrop-blur-md border border-white/30">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400"></span>
                </span>
                All Systems Operational
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            <div className="bg-white/40 backdrop-blur-xl p-5 rounded-2xl shadow-lg shadow-slate-200/50 border border-white/60 flex flex-col justify-between hover:bg-white/60 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-500/20 p-3 rounded-xl group-hover:bg-blue-500/30 transition-colors">
                  <User className="text-blue-700 w-6 h-6" />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Total Monitored</p>
                <p className="text-3xl font-extrabold text-slate-900">{profiles?.length || 0}</p>
              </div>
            </div>

            <div className="bg-white/40 backdrop-blur-xl p-5 rounded-2xl shadow-lg shadow-slate-200/50 border border-white/60 flex flex-col justify-between hover:bg-white/60 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-green-500/20 p-3 rounded-xl group-hover:bg-green-500/30 transition-colors">
                  <ShieldCheck className="text-green-700 w-6 h-6" />
                </div>
                <span className="bg-green-500/20 text-green-800 text-[10px] font-bold px-2 py-1 rounded-md border border-green-500/30">SAFE</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Normal Status</p>
                <p className="text-3xl font-extrabold text-slate-900">{safeProfilesCount}</p>
              </div>
            </div>

            <div className="bg-white/40 backdrop-blur-xl p-5 rounded-2xl shadow-lg shadow-slate-200/50 border border-white/60 flex flex-col justify-between hover:bg-white/60 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-yellow-500/20 p-3 rounded-xl group-hover:bg-yellow-500/30 transition-colors">
                  <Activity className="text-yellow-700 w-6 h-6" />
                </div>
                <span className="bg-yellow-500/20 text-yellow-800 text-[10px] font-bold px-2 py-1 rounded-md border border-yellow-500/30">WARN</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Warnings</p>
                <p className="text-3xl font-extrabold text-slate-900">{activeWarnings.length}</p>
              </div>
            </div>

            <div className="bg-white/40 backdrop-blur-xl p-5 rounded-2xl shadow-lg shadow-slate-200/50 border border-white/60 flex flex-col justify-between hover:bg-white/60 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-red-500/20 p-3 rounded-xl group-hover:bg-red-500/30 transition-colors">
                  <AlertTriangle className="text-red-700 w-6 h-6" />
                </div>
                <span className="bg-red-500/20 text-red-800 text-[10px] font-bold px-2 py-1 rounded-md border border-red-500/30">CRIT</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Emergencies</p>
                <p className="text-3xl font-extrabold text-slate-900">{activeEmergencies.length}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">Active Profiles</h3>
            </div>
            
            {profiles?.length === 0 ? (
              <div className="bg-white/40 backdrop-blur-xl p-12 text-center rounded-3xl border-2 border-dashed border-white/60 text-slate-600 shadow-sm">
                No elderly profiles found. Create one via the API docs first!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profiles?.map((profile) => {
                  const hasEmergency = activeEmergencies.some((ev: any) => ev.elderly_id === profile.id);
                  
                  return (
                    <div key={profile.id} className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-lg shadow-slate-200/50 border border-white/60 overflow-hidden hover:bg-white/60 hover:-translate-y-1 transition-all duration-300 group">
                      <div className="p-6">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform border border-white/20">
                            {profile.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-800">{profile.name}</h3>
                            <p className="text-sm text-slate-600 font-medium mt-0.5">{profile.age} years old</p>
                          </div>
                        </div>
                        
                        <div className={`rounded-xl p-4 mb-6 border flex justify-between items-center ${hasEmergency ? 'bg-red-50 border-red-200' : 'bg-white/50 border-white/60'}`}>
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</p>
                            <p className={`text-sm font-bold flex items-center gap-1.5 ${hasEmergency ? 'text-red-600' : 'text-green-600'}`}>
                              <span className={`w-2 h-2 rounded-full ${hasEmergency ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span> 
                              {hasEmergency ? 'Danger' : 'Normal'}
                            </p>
                          </div>
                          <Activity className={`w-8 h-8 ${hasEmergency ? 'text-red-400' : 'text-slate-400'}`} />
                        </div>

                        <button 
                          onClick={() => navigate(`/profile/${profile.id}`)}
                          className="w-full bg-slate-900/90 hover:bg-slate-900 text-white py-3 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 group-hover:shadow-lg"
                        >
                          Monitor Live
                          <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 md:hidden flex flex-col p-6">
          <div className="flex justify-between items-center mb-8 text-white">
            <div className="flex items-center gap-2">
               <ShieldCheck className="text-blue-500 w-8 h-8" />
               <h1 className="text-xl font-bold">ElderCare</h1>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)}><X size={28} /></button>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl overflow-hidden">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.full_name ? user.full_name.charAt(0) : 'U'
              )}
            </div>
            <div>
              <p className="text-white font-bold">{user?.full_name || 'Loading...'}</p>
              <p className="text-slate-400 text-sm">{user?.relationship_to_elderly || 'Caregiver'}</p>
            </div>
          </div>

          <nav className="flex-1 space-y-4">
            <button onClick={() => { navigate('/dashboard'); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 bg-blue-600 text-white px-4 py-4 rounded-xl font-bold text-lg">
              <Activity size={24} /> Dashboard
            </button>
            <button onClick={() => { navigate('/profiles'); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 text-slate-300 hover:bg-slate-800 px-4 py-4 rounded-xl font-medium text-lg">
              <User size={24} /> Profiles
            </button>
            <button onClick={() => { navigate('/emergency-log'); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 text-slate-300 hover:bg-slate-800 px-4 py-4 rounded-xl font-medium text-lg">
              <AlertTriangle size={24} /> Emergency Log
            </button>
            
            {user?.role === 'admin' && (
              <button onClick={() => { navigate('/admin'); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 text-red-400 hover:bg-red-500/10 px-4 py-4 rounded-xl font-medium text-lg">
                <ShieldAlert size={24} /> Admin Portal
              </button>
            )}

            <button onClick={() => { navigate('/settings'); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 text-slate-300 hover:bg-slate-800 px-4 py-4 rounded-xl font-medium text-lg">
              <Settings size={24} /> Settings
            </button>
          </nav>

          <button onClick={handleLogout} className="flex w-full items-center justify-center gap-3 bg-red-500/10 text-red-400 px-4 py-4 rounded-xl font-bold mt-auto border border-red-500/20">
            <LogOut size={24} /> Sign Out
          </button>
        </div>
      )}
    </div>
  );
}