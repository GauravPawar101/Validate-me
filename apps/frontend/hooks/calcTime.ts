"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { API_BACKEND_URL } from "@/config";

export function useActiveTime(getToken: () => Promise<string | null>) {
  const [activeTime, setActiveTime] = useState(0);
  const [earnings, setEarnings] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  let startTime = Date.now();

  useEffect(() => {
    async function fetchUserData() {
      const token = await getToken();
      if (!token) return;

      try {
        const { data } = await axios.get(`${API_BACKEND_URL}/api/v1/hours`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setActiveTime(data.hours);
        setEarnings(data.earnings);
        setTotalEarnings(data.total);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    }

    async function updateTime() {
      const endTime = Date.now();
      const timeSpent = (endTime - startTime) / 1000 / 3600; 
      startTime = Date.now();

      if (timeSpent <= 0) return;

      setActiveTime((prev) => prev + timeSpent);

      const token = await getToken();
      if (!token) return;

      try {
        const response = await axios.post(
          `${API_BACKEND_URL}/api/v1/hours`,
          { hours: timeSpent },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data) {
          setEarnings(response.data.updatedSessionEarnings);
          setTotalEarnings(response.data.updatedTotal);
        }
      } catch (error) {
        console.error("Failed to send active time:", error);
      }
    }

    fetchUserData();

    const interval = setInterval(updateTime, 60000); 

    return () => {
      updateTime();
      clearInterval(interval);
    };
  }, []);

  const updateEarnings = (newTotal) => {
    setTotalEarnings(newTotal);
  };
  return { activeTime, earnings, totalEarnings, updateEarnings };
}
