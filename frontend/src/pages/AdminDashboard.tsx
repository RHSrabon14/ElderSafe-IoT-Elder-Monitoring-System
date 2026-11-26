import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { 
  ShieldAlert, Users, Activity, Heart, Server, 
  ArrowLeft, FileText, CheckCircle, AlertTriangle, Download 
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch Admin Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/stats');
      return response.data;
    },
  });

  // Fetch All Users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/users');
      return response.data;
    },
  });

  // Fetch Audit Logs
  const { data: auditLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['adminAuditLogs'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/audit-logs');
      return response.data;
    },
  });

  // Handle CSV Download
  const handleExportCSV = async () => {
    try {
      setIsDownloading(true);
      // We must use responseType: 'blob' to download a file
      const response = await apiClient.get('/admin/export-csv', { responseType: 'blob' });
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'eldercare_sensor_data.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Failed to download CSV", error);
      alert("Failed to download CSV data.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (statsLoading || usersLoading || logsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xl font-medium text-slate-500">
        Loading Admin Dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      
      {/* Dark Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden lg:flex fixed h-full z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <Heart className="text-blue-500 w-8 h-8" />
          <div>
            <h1 className="text-lg font-bold leading-tight">ElderCare</h1>
            <p className="text-xs text-slate-400">Admin Portal</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-4">
          <button onClick={() => navigate('/dashboard')} className="w-full flex items-center gap-3 hover:bg-slate-800 px-4 py-3 rounded-lg font-medium text-slate-300 transition">
            <Activity size={20} /> Back to Dashboard
          </button>
          <button className="w-full flex items-center gap-3 bg-red-600 text-white px-4 py-3 rounded-lg font-bold shadow-lg shadow-red-500/30 transition">
            <ShieldAlert size={20} /> Admin Controls
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64 flex-1 p-4 md:p-8">
        
        {/* Top Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
            <span>Admin</span> <span>/</span> <span className="text-slate-800 font-bold">System Overview</span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* CSV EXPORT BUTTON */}
            <button 
              onClick={handleExportCSV} 
              disabled={isDownloading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition disabled:opacity-50"
            >
              <Download size={16} /> {isDownloading ? 'Exporting...' : 'Export CSV Data'}
            </button>

            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Users size={24} /></div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Total Users</p>
              <p className="text-2xl font-extrabold text-slate-800">{stats?.total_users || 0}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg"><Heart size={24} /></div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Elderly Profiles</p>
              <p className="text-2xl font-extrabold text-slate-800">{stats?.total_elderly || 0}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg"><Server size={24} /></div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Devices</p>
              <p className="text-2xl font-extrabold text-slate-800">{stats?.total_devices || 0}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-lg"><AlertTriangle size={24} /></div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Active Emergencies</p>
              <p className="text-2xl font-extrabold text-slate-800">{stats?.active_emergencies || 0}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Users size={20} className="text-blue-600" /> Registered Users
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-sm text-slate-500 uppercase">
                    <th className="py-2">Name</th>
                    <th className="py-2">Role</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((user: any) => (
                    <tr key={user.id} className="border-b text-sm">
                      <td className="py-3">
                        <p className="font-bold text-slate-800">{user.full_name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-green-600 font-bold flex items-center gap-1">
                          <CheckCircle size={14} /> {user.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-yellow-600" /> Recent Audit Logs
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-sm text-slate-500 uppercase">
                    <th className="py-2">User</th>
                    <th className="py-2">Action</th>
                    <th className="py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs?.map((log: any) => (
                    <tr key={log.id} className="border-b text-sm">
                      <td className="py-3 font-bold text-slate-800">{log.user_name}</td>
                      <td className="py-3 text-slate-600">{log.action} {log.target && `(${log.target})`}</td>
                      <td className="py-3 text-xs text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {auditLogs?.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-500">No logs recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}