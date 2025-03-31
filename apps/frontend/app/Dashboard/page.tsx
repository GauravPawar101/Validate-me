"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Activity, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useWebsites } from '@/hooks/useWebsites';
import { API_BACKEND_URL } from '@/config';
import axios from 'axios';
import { useAuth } from '@clerk/nextjs';

function CircularProgress({ percentage }: { percentage: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const statusColor = percentage >= 95 ? 'text-green-500' : 'text-red-500';

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="transform -rotate-90 w-24 h-24">
        <circle
          className="text-gray-700"
          strokeWidth="8"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="48"
          cy="48"
        />
        <circle
          className={statusColor}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="48"
          cy="48"
        />
      </svg>
      <span className={`absolute text-xl font-bold`}>{percentage}%</span>
    </div>
  );
}

function App() {
  const auth = useAuth();
  const getToken = useCallback(async () => await auth.getToken(), [auth]);
  const { websites, setWebsites,refreshWebsites, loading: apiLoading, error } = useWebsites(getToken);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWebsiteUrl, setNewWebsiteUrl] = useState("");
  const [expandedSite, setExpandedSite] = useState<string | null>(null);
  const [addingWebsite, setAddingWebsite] = useState(false);
  const [deletingWebsite, setDeletingWebsite] = useState<string | null>(null);
  const [localWebsites, setLocalWebsites] = useState([]);
  
  useEffect(() => {
    if (websites.length > 0) {
      setLocalWebsites(websites);
    }
  }, [websites]);

  const handleAddWebsite = async (url: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    setAddingWebsite(true);
  
    try {
      const token = await getToken();
      if (!token) throw new Error("No authentication token found");
  
      const response = await axios.post(
        `${API_BACKEND_URL}/api/v1/websites`,
        { url },
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
  
      console.log("Website added successfully!");
  
      refreshWebsites();
    } catch (err) {
      console.error("Error adding website:", err);
      setError("Error adding website, please try again.");
    } finally {
      setAddingWebsite(false);
    }
  };
  
  
  

  const handleDeleteWebsite = async (websiteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingWebsite) return; 
  
    try {
      setDeletingWebsite(websiteId);
  
      setWebsites((prev) =>
        prev.map((site) =>
          site.id === websiteId ? { ...site, disabled: true } : site
        )
      );
  
      const token = await getToken();
      if (!token) throw new Error("No authentication token found");
  
      await axios.delete(`${API_BACKEND_URL}/api/v1/websites/${websiteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      setWebsites((prev) => prev.filter((site) => site.id !== websiteId));
  
      if (expandedSite === websiteId) {
        setExpandedSite(null);
      }
    } catch (err) {
      console.error("Failed to delete website:", err);
      setError("Error deleting website, please try again.");
      
      refreshWebsites();
    } finally {
      setDeletingWebsite(null);
    }
  };
  

  const calculateUptime = (ticks: any[]) => {
    if (!ticks || ticks.length === 0) return 100;
    const upCount = ticks.filter(tick => tick.status === 'good').length;
    return Math.round((upCount / ticks.length) * 100);
  };

  const toggleExpand = (websiteId: string) => {
    setExpandedSite(currentExpanded => 
      currentExpanded === websiteId ? null : websiteId
    );
  };
  
  const getLastThirtyMinutesTicks = (ticks: any[]) => {
    if (!ticks || ticks.length === 0) {
      return new Array(10).fill({ status: 'unknown' }); // Placeholder grey ticks
    }
  
    const sortedTicks = [...ticks].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  
    return sortedTicks.slice(0, 10);
  };
  

  if (apiLoading && localWebsites.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-500" />
            <h1 className="text-2xl font-bold">Detime monitor</h1>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Website
          </button>
        </div>

        {apiLoading && localWebsites.length > 0 && (
          <div className="mb-4 flex items-center gap-2 text-blue-400">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"></div>
            <span>Refreshing data...</span>
          </div>
        )}

        <div className="space-y-4">
          {localWebsites.filter(website => !website.disabled).map((website) => {
            const isExpanded = expandedSite === website.id;
            const uptime = calculateUptime(website.ticks);
            const hasTicks = website.ticks && website.ticks.length > 0;
            const latestStatus = hasTicks ? website.ticks[0].status === 'good' : true;
            const thirtyMinutesTicks = getLastThirtyMinutesTicks(website.ticks);
            
            return (
              <div 
                key={website.id} 
                className={`bg-gray-800 rounded-lg transition-all ${
                  isExpanded ? 'p-8' : 'p-6'
                }`}
              >
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleExpand(website.id)}
                >
                  <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold">{website.url}</h2>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      latestStatus 
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {latestStatus ? 'Operational' : 'Down'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <CircularProgress percentage={uptime} />
                    
                    <button 
                      onClick={(e) => handleDeleteWebsite(website.id, e)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                      disabled={deletingWebsite !== null}
                      title="Delete Website"
                    >
                      {deletingWebsite === website.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"></div>
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                    
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
                
                {isExpanded &&  (
                  <div className="mt-6">
                    <div className="space-y-4">
                      <h3 className="text-sm text-gray-400">Last 30 minutes</h3>
                      <div className="flex gap-1">
                        {thirtyMinutesTicks.map((tick, index) => (
                          <div
                            key={index}
                            className="h-2 w-8 rounded transition-all"
                            style={{
                              backgroundColor: tick.status === 'good' ? '#22c55e' : tick.status === 'bad' ? '#ef4444' : '#6b7280',
                              opacity: 1 - (index * 0.05)
                            }}
                            title={new Date(tick.createdAt).toLocaleString()}
                          />
                        ))}
                      </div>
                      
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Website</h2>
            <input
              type="text"
              value={newWebsiteUrl}
              onChange={(e) => setNewWebsiteUrl(e.target.value)}
              placeholder="Enter website URL"
              className="w-full p-2 rounded bg-gray-700 text-white mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                disabled={addingWebsite}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={()=>handleAddWebsite(newWebsiteUrl)}
                disabled={addingWebsite}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {addingWebsite ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Adding...
                  </>
                ) : (
                  'Add'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;