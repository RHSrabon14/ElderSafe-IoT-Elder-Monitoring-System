import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import { 
  ArrowLeft, Heart, Activity, DoorClosed, AlertTriangle, Clock, 
  Calendar, Wifi, WifiOff, User, ShieldCheck, ShieldAlert, 
  Droplets, FileText, Settings, Phone, MapPin, UserCheck, Stethoscope,
  Pencil, Check, X
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function ElderlyProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('personal');
  
  const { liveData, isConnected } = useWebSocket();
  const [chartData, setChartData] = useState<any[]>([]);
  const [lastMovementTime, setLastMovementTime] = useState<Date>(new Date());
  const [timeSinceLastMovement, setTimeSinceLastMovement] = useState<string>('Just now');

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  // Settings State
  const [settingsForm, setSettingsForm] = useState<any>({});
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Fetch Profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['elderlyProfile', id],
    queryFn: async () => {
      const response = await apiClient.get('/elderly/');
      return response.data.find((p: any) => p.id === Number(id));
    },
  });

  // Fetch Emergency History
  const { data: emergencyHistory } = useQuery({
    queryKey: ['emergencyHistory', id],
    queryFn: async () => {
      const response = await apiClient.get(`/emergency/history/${id}`);
      return response.data;
    },
  });

  // Fetch Device Status (Phase 18)
  const { data: deviceStatus } = useQuery({
    queryKey: ['deviceStatus', id],
    queryFn: async () => {
      const response = await apiClient.get(`/elderly/${id}/device-status`);
      return response.data;
    },
    refetchInterval: 5000,
  });

  // Fetch Activity & Door Events (Phase 19)
  const { data: eventHistory } = useQuery({
    queryKey: ['eventHistory', id],
    queryFn: async () => {
      const response = await apiClient.get(`/elderly/${id}/events`);
      return response.data;
    },
    enabled: activeTab === 'activity' || activeTab === 'washroom',
  });

  // Fetch Emergency Contacts (Phase 20)
  const { data: contacts } = useQuery({
    queryKey: ['contacts', id],
    queryFn: async () => {
      const response = await apiClient.get(`/elderly/${id}/contacts`);
      return response.data;
    },
    enabled: activeTab === 'contacts',
  });

  // Fetch Monitoring Settings (Phase 22)
  const { data: settings } = useQuery({
    queryKey: ['settings', id],
    queryFn: async () => {
      const response = await apiClient.get(`/elderly/${id}/settings`);
      return response.data;
    },
    enabled: activeTab === 'settings',
  });

  // Sync settings to local form state when fetched
  useEffect(() => {
    if (settings) {
      setSettingsForm(settings);
    }
  }, [settings]);

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const response = await apiClient.put(`/elderly/${id}`, updatedData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elderlyProfile', id] });
      setIsEditing(false);
    },
  });

  // Update Settings Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const response = await apiClient.put(`/elderly/${id}/settings`, updatedData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', id] });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    },
  });

  const handleEditClick = () => {
    setEditForm(profile);
    setIsEditing(true);
  };

  const handleSave = () => {
    const payload = { ...editForm, age: Number(editForm.age) };
    updateProfileMutation.mutate(payload);
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      max_heart_rate: Number(settingsForm.max_heart_rate),
      min_heart_rate: Number(settingsForm.min_heart_rate),
      washroom_timeout_seconds: Number(settingsForm.washroom_timeout_seconds),
      inactivity_timeout_minutes: Number(settingsForm.inactivity_timeout_minutes),
    });
  };

  // Timer for "Last Movement" card
  useEffect(() => {
    const timer = setInterval(() => {
      const diffMs = new Date().getTime() - lastMovementTime.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) setTimeSinceLastMovement('Just now');
      else setTimeSinceLastMovement(`${diffMins} min ago`);
    }, 10000); // Update every 10 seconds
    return () => clearInterval(timer);
  }, [lastMovementTime]);

  useEffect(() => {
    if (liveData && liveData.device_id === "ESP32_001") {
      // Update the chart
      const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setChartData((prev) => {
        const updated = [...prev, { time: timeStr, bpm: liveData.heart_rate || 0, spo2: liveData.spo2 || 0 }];
        if (updated.length > 20) updated.shift();
        return updated;
      });

      // Update last movement if there's actual movement (heart rate > 0 or accel > 1.5)
      const hasMovement = (liveData.heart_rate > 0) || (liveData.accel && liveData.accel.x > 1.5);
      if (hasMovement) {
        setLastMovementTime(new Date());
      }
    }
  }, [liveData]);

  if (profileLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xl font-medium text-slate-500">Loading...</div>;
  if (!profile) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xl font-bold text-red-600">Profile not found.</div>;

  // Real data calculations
  const currentBPM = liveData?.heart_rate || 0;
  const currentSpO2 = liveData?.spo2 || 0;
  const doorState = liveData?.door_state || 'unknown';
  
  // Count active emergencies from the history query
  const activeEmergencies = emergencyHistory?.filter((ev: any) => ev.status === 'ACTIVE') || [];
  const hasActiveEmergency = activeEmergencies.length > 0;

  return (
    <div className="min-h-screen bg-slate-100 flex">
      
      {/* Dark Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden lg:flex fixed h-full z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <Heart className="text-blue-500 w-8 h-8" />
          <div>
            <h1 className="text-lg font-bold leading-tight">ElderCare</h1>
            <p className="text-xs text-slate-400">Guardian</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-4">
          <button onClick={() => navigate('/dashboard')} className="w-full flex items-center gap-3 hover:bg-slate-800 px-4 py-3 rounded-lg font-medium text-slate-300 transition">
            <Activity size={20} /> Dashboard
          </button>
          <button className="w-full flex items-center gap-3 bg-blue-600 text-white px-4 py-3 rounded-lg font-bold shadow-lg shadow-blue-500/30 transition">
            <User size={20} /> Elderly Profiles
          </button>
          <button className="w-full flex items-center gap-3 hover:bg-slate-800 px-4 py-3 rounded-lg font-medium text-slate-300 transition">
            <Clock size={20} /> Live Monitoring
          </button>
          <button className="w-full flex items-center gap-3 hover:bg-slate-800 px-4 py-3 rounded-lg font-medium text-slate-300 transition">
            <FileText size={20} /> Health Analytics
          </button>
          <button className="w-full flex items-center gap-3 hover:bg-slate-800 px-4 py-3 rounded-lg font-medium text-slate-300 transition">
            <AlertTriangle size={20} /> Emergency Center
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64 flex-1 p-4 md:p-8">
        
        {/* Top Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
            <span>Dashboard</span> <span>/</span> <span>Elderly Profiles</span> <span>/</span> <span className="text-slate-800 font-bold">Profile Details</span>
          </div>
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
            <ArrowLeft size={16} /> Back to List
          </button>
        </div>

        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            
            {/* Avatar & Basic Info */}
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 text-5xl font-bold border-4 border-white shadow-md">
                {profile.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">{profile.name}</h1>
                <p className="text-slate-500 font-medium mt-1">ID: EL-{profile.id.toString().padStart(3, '0')} • Age: {profile.age} • {profile.gender || 'Male'}</p>
                <div className="flex items-center gap-2 mt-3 text-sm text-slate-600">
                  <MapPin size={16} /> {profile.address || 'Address not set'}
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
                  <Phone size={16} /> {profile.phone_number || 'Phone not set'}
                </div>
                
                {/* Device Status Badge */}
                <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${deviceStatus?.status === 'ONLINE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  <span className={`w-2 h-2 rounded-full ${deviceStatus?.status === 'ONLINE' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                  {deviceStatus?.status === 'ONLINE' ? 'Device Online' : 'Device Offline'}
                </div>
              </div>
            </div>

            {/* Medical Info Summary */}
            <div className="flex-1 border-t md:border-t-0 md:border-l border-slate-200 pt-6 md:pt-0 md:pl-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Heart size={14} className="text-red-500"/> Medical Info</p>
                <p className="text-sm font-semibold text-slate-800">{profile.medical_conditions || 'None recorded'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><AlertTriangle size={14} className="text-yellow-500"/> Allergies</p>
                <p className="text-sm font-semibold text-slate-800">Penicillin</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Stethoscope size={14} className="text-blue-500"/> Doctor</p>
                <p className="text-sm font-semibold text-slate-800">{profile.doctor_contact || 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><FileText size={14} className="text-slate-500"/> Notes</p>
                <p className="text-sm font-semibold text-slate-800">{profile.medical_notes || 'None'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Vitals Summary Cards - DYNAMIC DATA */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className={`bg-white p-4 rounded-xl border shadow-sm flex flex-col items-center text-center ${currentBPM === 0 ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
            <Heart className={`w-6 h-6 mb-2 ${currentBPM === 0 ? 'text-red-600' : 'text-red-500'}`} />
            <p className="text-xs font-bold text-slate-500 uppercase">Heart Rate</p>
            <p className="text-2xl font-extrabold text-slate-800">{currentBPM} <span className="text-sm font-medium text-slate-400">BPM</span></p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded mt-1 ${currentBPM === 0 ? 'bg-red-100 text-red-700' : 'bg-green-50 text-green-600'}`}>
              {currentBPM === 0 ? 'No Pulse' : 'Normal'}
            </span>
          </div>
          
          <div className={`bg-white p-4 rounded-xl border shadow-sm flex flex-col items-center text-center ${currentSpO2 === 0 ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
            <Droplets className={`w-6 h-6 mb-2 ${currentSpO2 === 0 ? 'text-red-600' : 'text-blue-500'}`} />
            <p className="text-xs font-bold text-slate-500 uppercase">SpO2</p>
            <p className="text-2xl font-extrabold text-slate-800">{currentSpO2} <span className="text-sm font-medium text-slate-400">%</span></p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded mt-1 ${currentSpO2 === 0 ? 'bg-red-100 text-red-700' : 'bg-green-50 text-green-600'}`}>
              {currentSpO2 === 0 ? 'No Data' : 'Normal'}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
            <Activity className="w-6 h-6 text-green-500 mb-2" />
            <p className="text-xs font-bold text-slate-500 uppercase">Last Movement</p>
            <p className="text-2xl font-extrabold text-slate-800">{timeSinceLastMovement}</p>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded mt-1">Active</span>
          </div>

          <div className={`bg-white p-4 rounded-xl border shadow-sm flex flex-col items-center text-center ${hasActiveEmergency ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
            <AlertTriangle className={`w-6 h-6 mb-2 ${hasActiveEmergency ? 'text-red-600' : 'text-yellow-500'}`} />
            <p className="text-xs font-bold text-slate-500 uppercase">Active Alerts</p>
            <p className="text-2xl font-extrabold text-slate-800">{activeEmergencies.length}</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded mt-1 ${hasActiveEmergency ? 'bg-red-100 text-red-700' : 'bg-green-50 text-green-600'}`}>
              {hasActiveEmergency ? 'Danger' : 'All Clear'}
            </span>
          </div>
        </div>

        {/* Horizontal Tabs */}
        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex gap-2 overflow-x-auto mb-6">
          {[
            { id: 'personal', label: 'Personal', icon: <User size={18} /> },
            { id: 'health', label: 'Health', icon: <Heart size={18} /> },
            { id: 'activity', label: 'Activity', icon: <Activity size={18} /> },
            { id: 'washroom', label: 'Washroom', icon: <DoorClosed size={18} /> },
            { id: 'device', label: 'Devices', icon: <Wifi size={18} /> },
            { id: 'emergency', label: 'Emergencies', icon: <AlertTriangle size={18} /> },
            { id: 'contacts', label: 'Contacts', icon: <Phone size={18} /> },
            { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-[400px]">
          
          {activeTab === 'personal' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">Profile Details</h3>
                {!isEditing ? (
                  <button onClick={handleEditClick} className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 transition">
                    <Pencil size={16} /> Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-lg font-bold hover:bg-slate-200 transition">
                      <X size={16} /> Cancel
                    </button>
                    <button onClick={handleSave} disabled={updateProfileMutation.isPending} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition">
                      <Check size={16} /> {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Personal Info Column */}
                <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Personal Information</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Full Name</label>
                      {isEditing ? (
                        <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full p-2 border rounded-lg bg-slate-50" />
                      ) : (
                        <p className="font-bold text-slate-800">{profile.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Age</label>
                      {isEditing ? (
                        <input type="number" value={editForm.age || ''} onChange={(e) => setEditForm({...editForm, age: e.target.value})} className="w-full p-2 border rounded-lg bg-slate-50" />
                      ) : (
                        <p className="font-bold text-slate-800">{profile.age} Years</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Gender</label>
                      {isEditing ? (
                        <select value={editForm.gender || ''} onChange={(e) => setEditForm({...editForm, gender: e.target.value})} className="w-full p-2 border rounded-lg bg-slate-50">
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        <p className="font-bold text-slate-800">{profile.gender || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Address</label>
                      {isEditing ? (
                        <input type="text" value={editForm.address || ''} onChange={(e) => setEditForm({...editForm, address: e.target.value})} className="w-full p-2 border rounded-lg bg-slate-50" />
                      ) : (
                        <p className="font-bold text-slate-800">{profile.address || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Phone</label>
                      {isEditing ? (
                        <input type="text" value={editForm.phone_number || ''} onChange={(e) => setEditForm({...editForm, phone_number: e.target.value})} className="w-full p-2 border rounded-lg bg-slate-50" />
                      ) : (
                        <p className="font-bold text-slate-800">{profile.phone_number || 'N/A'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Medical Details Column */}
                <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Medical Details</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Medical Conditions</label>
                      {isEditing ? (
                        <input type="text" value={editForm.medical_conditions || ''} onChange={(e) => setEditForm({...editForm, medical_conditions: e.target.value})} className="w-full p-2 border rounded-lg bg-slate-50" />
                      ) : (
                        <p className="font-bold text-red-600">{profile.medical_conditions || 'None'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Doctor Contact</label>
                      {isEditing ? (
                        <input type="text" value={editForm.doctor_contact || ''} onChange={(e) => setEditForm({...editForm, doctor_contact: e.target.value})} className="w-full p-2 border rounded-lg bg-slate-50" />
                      ) : (
                        <p className="font-bold text-blue-600">{profile.doctor_contact || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Medical Notes</label>
                      {isEditing ? (
                        <textarea value={editForm.medical_notes || ''} onChange={(e) => setEditForm({...editForm, medical_notes: e.target.value})} className="w-full p-2 border rounded-lg bg-slate-50 h-24" />
                      ) : (
                        <p className="text-sm font-medium text-slate-700">{profile.medical_notes || 'N/A'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'health' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Health Monitoring</h3>
              <div className="h-75 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="time" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" domain={[60, 100]} tick={{fill: '#ef4444', fontSize: 12}} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" domain={[90, 100]} tick={{fill: '#3b82f6', fontSize: 12}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    <Area yAxisId="left" type="monotone" dataKey="bpm" name="Heart Rate" stroke="#ef4444" strokeWidth={3} fillOpacity={0.1} fill="#ef4444" />
                    <Area yAxisId="right" type="monotone" dataKey="spo2" name="SpO2" stroke="#3b82f6" strokeWidth={3} fillOpacity={0.1} fill="#3b82f6" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4">Activity Timeline</h3>
              <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
                {eventHistory?.activities?.length ? (
                  eventHistory.activities.map((ev: any) => (
                    <div key={ev.id} className="relative pl-8">
                      <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-4 border-white ${
                        ev.event_type === 'POSSIBLE_FALL' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                      <p className="text-xs font-bold text-slate-500 mb-1">
                        {new Date(ev.created_at).toLocaleString()}
                      </p>
                      <h3 className="text-lg font-bold text-slate-800">
                        {ev.event_type.replaceAll('_', ' ')}
                      </h3>
                      <p className="text-sm text-slate-600">{ev.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 pl-4">No activity events recorded yet.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'washroom' && (
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4">Washroom Door History</h3>
              <div className="space-y-3">
                {eventHistory?.doors?.length ? (
                  eventHistory.doors.map((ev: any) => (
                    <div key={ev.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <DoorClosed className={ev.door_state === 'OPEN' ? 'text-yellow-500' : 'text-green-500'} />
                        <p className="font-bold text-slate-800 capitalize">
                          Door {ev.door_state.toLowerCase()}
                        </p>
                      </div>
                      <p className="text-sm text-slate-500">
                        {new Date(ev.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500">No door events recorded yet.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'device' && (
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4">Device Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-xl border flex items-center gap-3 ${deviceStatus?.status === 'ONLINE' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                  <Wifi className={deviceStatus?.status === 'ONLINE' ? 'text-green-600' : 'text-red-600'} />
                  <div>
                    <p className={`text-xs font-bold ${deviceStatus?.status === 'ONLINE' ? 'text-green-700' : 'text-red-700'}`}>ESP32</p>
                    <p className={`text-sm font-bold ${deviceStatus?.status === 'ONLINE' ? 'text-green-800' : 'text-red-800'}`}>{deviceStatus?.status || 'Unknown'}</p>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center gap-3">
                  <Activity className="text-green-600" />
                  <div><p className="text-xs font-bold text-green-700">MPU6050</p><p className="text-sm font-bold text-green-800">OK</p></div>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center gap-3">
                  <Heart className="text-green-600" />
                  <div><p className="text-xs font-bold text-green-700">MAX30102</p><p className="text-sm font-bold text-green-800">OK</p></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'emergency' && (
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4">Emergency History</h3>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-sm text-slate-500 uppercase">
                    <th className="py-2">Date & Time</th>
                    <th className="py-2">Event Type</th>
                    <th className="py-2">Severity</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {emergencyHistory?.map((ev: any) => (
                    <tr key={ev.id} className="border-b text-sm">
                      <td className="py-3 text-slate-600">{new Date(ev.created_at).toLocaleString()}</td>
                      <td className="py-3 font-bold text-slate-800">{ev.event_type.replace('_', ' ')}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${ev.severity === 'EMERGENCY' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{ev.severity}</span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${ev.status === 'ACTIVE' ? 'text-red-600' : 'text-green-600'}`}>{ev.status}</span>
                      </td>
                    </tr>
                  ))}
                  {emergencyHistory?.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-500">No emergencies recorded.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4">Emergency Contacts</h3>
              <div className="space-y-3">
                {contacts?.length ? (
                  contacts.map((contact: any) => (
                    <div key={contact.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-800">{contact.name} <span className="text-xs text-slate-400 ml-2">{contact.relationship}</span></p>
                        <p className="text-sm text-slate-500">{contact.phone}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${contact.priority === 1 ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'}`}>
                        {contact.priority === 1 ? 'Primary' : `Priority ${contact.priority}`}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500">No emergency contacts added yet.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4">Monitoring Settings</h3>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Max Heart Rate Threshold (BPM)</label>
                  <input 
                    type="number" 
                    value={settingsForm.max_heart_rate || ''} 
                    onChange={(e) => setSettingsForm({...settingsForm, max_heart_rate: e.target.value})} 
                    className="w-full p-2 border rounded-lg bg-slate-50" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Min Heart Rate Threshold (BPM)</label>
                  <input 
                    type="number" 
                    value={settingsForm.min_heart_rate || ''} 
                    onChange={(e) => setSettingsForm({...settingsForm, min_heart_rate: e.target.value})} 
                    className="w-full p-2 border rounded-lg bg-slate-50" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Washroom Timeout (Seconds)</label>
                  <input 
                    type="number" 
                    value={settingsForm.washroom_timeout_seconds || ''} 
                    onChange={(e) => setSettingsForm({...settingsForm, washroom_timeout_seconds: e.target.value})} 
                    className="w-full p-2 border rounded-lg bg-slate-50" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Inactivity Alert (Minutes)</label>
                  <input 
                    type="number" 
                    value={settingsForm.inactivity_timeout_minutes || ''} 
                    onChange={(e) => setSettingsForm({...settingsForm, inactivity_timeout_minutes: e.target.value})} 
                    className="w-full p-2 rounded-lg bg-slate-50" 
                  />
                </div>
                
                <div className="flex items-center gap-4 pt-2">
                  <button 
                    onClick={handleSaveSettings} 
                    disabled={updateSettingsMutation.isPending} 
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition"
                  >
                    {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                  </button>
                  {settingsSaved && <span className="text-green-600 font-bold text-sm">Settings saved successfully!</span>}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}