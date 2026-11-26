import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { ArrowLeft, AlertTriangle, ShieldCheck, Clock, Heart, Activity } from 'lucide-react';

export default function EmergencyLog() {
  const navigate = useNavigate();

  // Fetch all elderly profiles first
  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ['elderlyProfiles'],
    queryFn: async () => {
      const response = await apiClient.get('/elderly/');
      return response.data;
    },
  });

  // Fetch emergencies for all profiles
  const { data: allEmergencies, isLoading: emergenciesLoading } = useQuery({
    queryKey: ['allEmergenciesLog', profiles],
    queryFn: async () => {
      if (!profiles) return [];
      
      const promises = profiles.map((p: any) => 
        apiClient.get(`/emergency/history/${p.id}`).then(res => res.data)
      );
      
      const results = await Promise.all(promises);
      
      // Flatten and sort by most recent
      const flatList = results.flat();
      return flatList.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!profiles,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  if (profilesLoading || emergenciesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-xl font-bold text-slate-500">Loading Emergency Log...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-100 via-slate-50 to-blue-50/30 p-8">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 font-semibold">
          <ArrowLeft size={20} /> Back to Dashboard
        </button>
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900">Emergency Log</h1>
          <span className="bg-red-100 text-red-700 px-4 py-1.5 rounded-full font-bold text-sm border border-red-200">
            {allEmergencies?.length || 0} Total Events
          </span>
        </div>

        {allEmergencies?.length === 0 ? (
          <div className="bg-white/40 backdrop-blur-xl p-12 rounded-3xl border border-white/60 shadow-lg text-center">
            <div className="bg-green-500/20 p-6 rounded-full inline-block mb-4">
              <ShieldCheck className="w-16 h-16 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">All Clear</h2>
            <p className="text-slate-600">No emergency events have been recorded yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Event Type</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allEmergencies?.map((ev: any) => (
                  <tr key={`${ev.id}-${ev.elderly_id}`} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        {new Date(ev.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-800 flex items-center gap-2">
                        {ev.event_type === 'POSSIBLE_FALL' && <Activity size={16} className="text-red-500" />}
                        {ev.event_type === 'HEART_RATE_LOST' && <Heart size={16} className="text-red-500" />}
                        {ev.event_type === 'WASHROOM_TIMEOUT' && <AlertTriangle size={16} className="text-yellow-500" />}
                        {ev.event_type.replaceAll('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-md truncate">
                      {ev.description}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                        ev.severity === 'EMERGENCY' 
                          ? 'bg-red-100 text-red-700 border border-red-200' 
                          : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                      }`}>
                        {ev.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-sm font-bold ${
                        ev.status === 'ACTIVE' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${ev.status === 'ACTIVE' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                        {ev.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}