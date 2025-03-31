"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Image from "next/image";
import {
  Plus,
  Activity,
  ChevronDown,
  ChevronUp,
  Trash2,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  CheckCircle2,
  Globe,
  Link,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {CashOut} from './cashOut';
import { useWallet } from "@/app/WalletContext";
import { useActiveTime } from "@/hooks/calcTime";
import { useWebsites } from '@/hooks/useWebsites';
import { API_BACKEND_URL } from '@/config';
import axios from 'axios';
import { useAuth } from '@clerk/nextjs';
import CashOutModal from './cashOut';
import withdrawAmount from '@/hooks/cashOut';
import { clusterApiUrl, Connection, PublicKey, PublicKeyInitData, SystemProgram, Transaction } from '@solana/web3.js';

async function getBalance(walletPublicKey: PublicKey) {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const balance = await connection.getBalance(walletPublicKey);
  console.log(`Balance: ${balance / 1e9} SOL`);
  return balance;
}

async function cashOut(phantomProvider: { publicKey: any; signTransaction: (arg0: any) => any; }, recipientAddress: PublicKeyInitData) {
  try {
      if (!phantomProvider) throw new Error("Phantom wallet not found");

      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const sender = await phantomProvider.publicKey;

      if (!sender) throw new Error("Connect to Phantom first");

      const balance = await getBalance(sender);
      if (balance < 0.0001 * 1e9) { // Wrap the console log in curly braces
          console.log("Not enough balance to send");
          return;
      }

      const recipient = new PublicKey(recipientAddress);
      const lamportsToSend = balance - 5000; 

      const transaction = new Transaction().add(
          SystemProgram.transfer({
              fromPubkey: sender,
              toPubkey: recipient,
              lamports: lamportsToSend,
          })
      );

      transaction.feePayer = sender;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signedTransaction = await phantomProvider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());

      console.log(`Transaction sent: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  } catch (error) {
      console.error("Error cashing out:", error);
  }
}

function CircularProgress({ percentage }) {
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

function Dashboard() {
  const auth = useAuth();
  const getToken = useCallback(async () => await auth.getToken(), [auth]);
  const { walletAddress, connectWallet } = useWallet();
  const { activeTime, earnings, totalEarnings , updateEarnings} = useActiveTime(getToken);
  const { websites, setWebsites, refreshWebsites, loading: apiLoading, error: websiteError } = useWebsites(getToken);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWebsiteUrl, setNewWebsiteUrl] = useState("");
  const [expandedSite, setExpandedSite] = useState(null);
  const [addingWebsite, setAddingWebsite] = useState(false);
  const [deletingWebsite, setDeletingWebsite] = useState(null);
  const [localWebsites, setLocalWebsites] = useState([]);
  const [error, setError] = useState(null);
  const [validationInProgress, setValidationInProgress] = useState({});
  

  
useEffect(() => {
  if (websites && websites.length > 0) {
    setLocalWebsites(prevWebsites => {
      if (prevWebsites.length === 0) return websites;
      
      return websites.map(newSite => {
        const existingSite = prevWebsites.find(site => site.id === newSite.id);
        
        if (!existingSite) return newSite;
        
        
        const existingTicks = existingSite.ticks || [];
        const newTicks = newSite.ticks || [];
        const allTicks = [...existingTicks, ...newTicks];
        
        
        const tickMap = new Map();
        allTicks.forEach(tick => {
          const existingTick = tickMap.get(tick.id);
          if (!existingTick || new Date(tick.createdAt) > new Date(existingTick.createdAt)) {
            tickMap.set(tick.id, tick);
          }
        });
        const mergedTicks = Array.from(tickMap.values())
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        return {
          ...newSite,
          ticks: mergedTicks
        };
      });
    });
  }
}, [websites]);

  const validateWebsite = async (url, websiteId) => {
    try {
      const token = await getToken();
      if (!token) throw new Error("No authentication token found");
      
      const response = await axios.post(
        `${API_BACKEND_URL}/api/v1/validate`,
        { url, websiteId }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const tickData = response.data.tick || response.data;
      
      const formattedTick = {
        websiteId,
        status: tickData.status || 'bad',
        message: tickData.message || tickData.details?.message,
        latency: tickData.latency || 0,
        createdAt: tickData.createdAt || new Date().toISOString(),
      };
      
      return {
        status: tickData.status || 'bad',
        message: tickData.message || tickData.details?.message,
        tick: formattedTick
      };
    } catch (err) {
      console.error("Error validating website:", err);
      return { 
        status: 'bad', 
        message: err.message || "Connection failed",
        tick: {
          websiteId,
          status: 'bad',
          message: err.message || "Connection failed",
          createdAt: new Date().toISOString(),
          latency: 0
        }
      };
    }
  };
  const triggerValidation = async (websiteId, url) => {
    if (validationInProgress[websiteId]) return;
    
    setValidationInProgress(prev => ({ ...prev, [websiteId]: true }));
    
    try {
      const validationResult = await validateWebsite(url, websiteId);
      if (validationResult && validationResult.tick) {
        setLocalWebsites(prevWebsites => 
          prevWebsites.map(site => {
            if (site.id === websiteId) {
              const newTick = {
                ...validationResult.tick,
                id: validationResult.tick.id || `temp-${Date.now()}`
              };
              
              const existingTicks = site.ticks || [];
              const filteredTicks = existingTicks.filter(tick => 
                tick.id !== newTick.id
              );
              
              return {
                ...site,
                ticks: [newTick, ...filteredTicks]
              };
            }
            return site;
          })
        );
      }
      
      return validationResult;
    } catch (err) {
      console.error("Error triggering validation:", err);
      return { status: 'bad', message: err.message || "Validation failed" };
    } finally {
      setValidationInProgress(prev => ({ ...prev, [websiteId]: false }));
    }
  };
  useEffect(() => {
    if (!localWebsites || localWebsites.length === 0) return;
    
    const interval = setInterval(async () => {
      const activeWebsites = localWebsites.filter(site => !site.disabled);
      
      for (const website of activeWebsites) {
        await triggerValidation(website.id, website.url);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }, 5 * 60 * 1000); 
    
    return () => clearInterval(interval);
  }, [localWebsites]);

  const handleAddWebsite = async (url) => {
    if (!url) return;
    setAddingWebsite(true);
    setError(null);
    
    try {
      const token = await getToken();
      if (!token) throw new Error("No authentication token found");
      
      const response = await axios.post(
        `${API_BACKEND_URL}/api/v1/website`,  
        { url },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
      
      console.log("Website added successfully!");
      setShowAddModal(false);
      setNewWebsiteUrl("");
      refreshWebsites();
      
      if (response.data && response.data.id) {
        setTimeout(() => {
          triggerValidation(response.data.id, url);
        }, 1000);
      }
    } catch (err) {
      console.error("Error adding website:", err);
      setError("Error adding website. Please check the URL and try again.");
    } finally {
      setAddingWebsite(false);
    }
  };
  
  const handleDeleteWebsite = async (websiteId) => {
    setDeletingWebsite(websiteId);
    try {
      const token = await getToken();
      if (!token) throw new Error("No authentication token found");
      
      await axios.delete(
        `${API_BACKEND_URL}/api/v1/website/${websiteId}`, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      refreshWebsites();
    } catch (err) {
      console.error("Error deleting website:", err);
      setError("Error deleting website. Please try again.");
    } finally {
      setDeletingWebsite(null);
    }
  };
  const calculateUptime = (ticks) => {
    if (!ticks || ticks.length === 0) return 100;
    const upCount = ticks.filter(tick => tick.status === 'good').length;
    return Math.round((upCount / ticks.length) * 100);
  };

  const toggleExpand = (websiteId) => {
    setExpandedSite(currentExpanded => 
      currentExpanded === websiteId ? null : websiteId
    );
  };
  
  const getLastThirtyMinutesTicks = (ticks) => {
    if (!ticks || ticks.length === 0) {
      return Array(10).fill().map((_, i) => ({
        status: 'unknown',
        createdAt: new Date(Date.now() - (i * 3 * 60 * 1000)).toISOString() 
      }));
    };const sortedTicks = [...ticks].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (sortedTicks.length < 10) {
      const lastTime = sortedTicks.length > 0 
        ? new Date(sortedTicks[sortedTicks.length - 1].createdAt).getTime()
        : Date.now();
        
      const padTicks = Array(10 - sortedTicks.length).fill().map((_, i) => ({
        status: 'unknown',
        createdAt: new Date(lastTime - ((i + 1) * 3 * 60 * 1000)).toISOString()
      }));
      
      return [...sortedTicks, ...padTicks];
    }
  
    return sortedTicks.slice(0, 10);
  };

  if (apiLoading && localWebsites.length === 0) {
    return (
      <div className="min-h-screen bg-[#111111] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111] text-[#FFFFFF]">
      <div className="relative h-64 w-full">
        <div className="absolute inset-0 bg-gradient-to-b from-[#222222] to-[#111111]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#111111]"></div>
      </div>
      <div className="container mx-auto px-4 -mt-20 relative z-10">
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#222222] p-6 mb-8 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold mb-2">Detime Monitor</h1>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse"></div>
                <span className="text-[#10B981]">All Systems Operational</span>
              </div>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Website
              </button>
              <button onClick={()=>setIsModalOpen(true)} className="bg-[#8B7355] text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-all">
                Cash Out
              </button>
              <CashOutModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} updateEarnings={updateEarnings} getToken={getToken} />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-[#222222] hover:bg-[#37373789] rounded-xl p-6 cursor-pointer transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#A3A3A3] mb-1">Today</p>
                  <h2 className="text-3xl font-bold">${(earnings || 0).toFixed(2)}</h2>
                  <p className="text-[#10B981] flex items-center mt-2">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Last {(activeTime/6).toFixed(2)} hours
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-[#222222] rounded-xl p-6 hover:bg-[#37373789] transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#A3A3A3] mb-1">Total Earnings</p>
                  <h2 className="text-3xl font-bold">${(totalEarnings || 0).toFixed(2)}</h2>
                  <p className="text-[#8B7355] flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +15.3% this month
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#222222] rounded-xl p-6 hover:bg-[#37373789] transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#A3A3A3] mb-1">Wallet</p>
                  <h2 className="text-xl font-bold truncate">
                    {walletAddress ? (
                      <>{walletAddress.slice(0, 4)}...{walletAddress.slice(-15)}</>
                    ) : (
                      <button 
                        onClick={connectWallet}
                        className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm"
                      >
                        Connect Wallet
                      </button>
                    )}
                  </h2>
                  <p className="text-[#A3A3A3] flex items-center mt-2">
                    <ArrowUpRight className="w-4 h-4 mr-1" /> 
                    {activeTime.toFixed(2)} minutes active
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {(error || websiteError) && (
          <div className="bg-red-500/20 text-red-400 p-4 rounded-lg mb-6">
            {error || websiteError}
          </div>
        )}
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#222222] p-6 mb-8">
          <h2 className="text-xl font-bold mb-6">Monitored Sites</h2>
          
          {apiLoading && localWebsites.length > 0 && (
            <div className="mb-4 flex items-center gap-2 text-blue-400">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"></div>
              <span>Refreshing data...</span>
            </div>
          )}
          
          <div className="space-y-4">
            {localWebsites && localWebsites.filter(website => !website.disabled).length > 0 ? (
              localWebsites.filter(website => !website.disabled).map((website) => {
                const isExpanded = expandedSite === website.id;
                const uptime = calculateUptime(website.ticks);
                const hasTicks = website.ticks && website.ticks.length > 0;
                const latestStatus = hasTicks ? website.ticks[0].status === 'good' : true;
                const thirtyMinutesTicks = getLastThirtyMinutesTicks(website.ticks);
                const isValidating = validationInProgress[website.id];
                
                return (
                  <div 
                    key={website.id} 
                    className={`bg-[#222222] rounded-lg transition-all ${
                      isExpanded ? 'p-6' : 'p-4'
                    }`}
                  >
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleExpand(website.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-[#125296c5] bg-opacity-10 p-2 rounded-full">
                          <Globe className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{website.url}</h3>
                            <a
                              href={website.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#8B7355] hover:text-opacity-80"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link className="w-4 h-4" />
                            </a>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-3 py-1 rounded-full text-xs ${
                              latestStatus 
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {latestStatus ? 'Operational' : 'Down'}
                            </span>
                            
                            {hasTicks && website.ticks[0].message && !latestStatus && (
                              <div className="flex items-center text-xs text-red-400">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                <span className="truncate max-w-[200px]">
                                  {website.ticks[0].message}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerValidation(website.id, website.url);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-full transition-colors"
                          disabled={isValidating}
                          title="Validate Now"
                        >
                          <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
                        </button>
                        
                        <div className="text-right">
                          <p className={`font-medium ${uptime > 95 ? 'text-[#10B981]' : uptime > 80 ? 'text-yellow-500' : 'text-red-500'}`}>
                            {uptime}%
                          </p>
                          <p className="text-sm text-[#A3A3A3]">Uptime</p>
                        </div>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWebsite(website.id);
                          }}
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
                    
                    {isExpanded && (
                      <div className="mt-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm text-gray-400">Last 30 minutes</h3>
                            <div className="text-xs text-gray-500">
                              {hasTicks && website.ticks.length > 0 && (
                                <span>Last checked: {new Date(website.ticks[0].createdAt).toLocaleTimeString()}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-1">
                            {thirtyMinutesTicks.map((tick, index) => {
                            const bgColor = 
                                tick.status === 'good' ? '#22c55e' : 
                                tick.status === 'bad' ? '#ef4444' : 
                                '#6b7280';  
                              
                              return (
                                <div
                                  key={index}
                                  className="group relative h-8 w-8 rounded cursor-pointer transition-all hover:opacity-80"
                                  style={{
                                    backgroundColor: bgColor,
                                    opacity: 1 - (index * 0.05)
                                  }}
                                >
                                  {/* Tooltip */}
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-10">
                                    {tick.createdAt ? (
                                      <>
                                        {new Date(tick.createdAt).toLocaleTimeString()}
                                        <br />
                                        Status: {tick.status === 'good' ? 'Operational' : tick.status === 'bad' ? 'Down' : 'No data'}
                                        {tick.message && <><br />{tick.message}</> }
                                      </>
                                    ) : (
                                      'No data available'
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {hasTicks && website.ticks[0] && (
                            <div className="mt-4 text-sm">
                              <p className="text-gray-400">
                                Latest status: <span className={latestStatus ? 'text-green-400' : 'text-red-400'}>
                                  {latestStatus ? 'Operational' : 'Down'}
                                </span>
                                {website.ticks[0].message && !latestStatus && (
                                  <span className="block mt-1 text-red-400">
                                    Error: {website.ticks[0].message}
                                  </span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="bg-[#222222] rounded-lg p-6 text-center">
                <p className="text-gray-400">No websites being monitored. Add your first website to start.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1A1A1A] p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Website</h2>
            <input
              type="text"
              value={newWebsiteUrl}
              onChange={(e) => setNewWebsiteUrl(e.target.value)}
              placeholder="Enter website URL (https://example.com)"
              className="w-full p-2 rounded bg-[#222222] text-white mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewWebsiteUrl("");
                  setError(null);
                }}
                disabled={addingWebsite}
                className="px-4 py-2 rounded bg-[#333333] hover:bg-[#444444] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddWebsite(newWebsiteUrl)}
                disabled={addingWebsite || !newWebsiteUrl}
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

export default Dashboard;