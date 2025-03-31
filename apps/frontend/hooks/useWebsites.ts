"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { API_BACKEND_URL } from "@/config";

interface Website {
  id: string;
  url: string;
  disabled: boolean;
  ticks: {
    id: string;
    createdAt: string;
    status: string;
    latency: number;
  }[];
}

export function useWebsites(getToken: () => Promise<string | null>) {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isRefreshing = useRef(false);
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const refreshWebsites = useCallback(async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenRef.current();
      if (!token) throw new Error("Authentication token not found.");
      
      const response = await axios.get<{ websites: Website[] }>(
        `${API_BACKEND_URL}/api/v1/websites`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (!response.data || !Array.isArray(response.data.websites)) {
        throw new Error("Invalid response format from API");
      }
      
      setWebsites([...response.data.websites]);
    } catch (err) {
      console.error("Failed to fetch websites:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
      isRefreshing.current = false;
    }
  }, []);

  useEffect(() => {
    refreshWebsites();
    const interval = setInterval(refreshWebsites, 60000);
    return () => clearInterval(interval);
  }, [refreshWebsites]); 

  return { websites, setWebsites, refreshWebsites, loading, error };
}