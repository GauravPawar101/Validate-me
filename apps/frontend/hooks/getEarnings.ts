import { useEffect, useState } from "react";
import axios from "axios";
import { API_BACKEND_URL } from "@/config";

export function useEarnings(getToken: () => Promise<string | null>) {
  const [daily, setDaily] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function fetchEarnings() {
    try {
      const token = await getToken();
      if (!token) {
        setError("Authentication token not found.");
        return;
      }
      const dailyResponse = await axios.get(`${API_BACKEND_URL}/api/v1/earnings/daily`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const totalResponse = await axios.get(`${API_BACKEND_URL}/api/v1/earnings/total`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!dailyResponse.data || !totalResponse.data) {
        throw new Error("Invalid response from API");
      }

      setDaily(dailyResponse.data.daily);
      setTotal(totalResponse.data.total);
    } catch (err: any) {
      console.error("Failed to fetch earnings:", err);
      setError(err.message || "An error occurred");
    }
  }

  useEffect(() => {
    fetchEarnings();
    const interval = setInterval(fetchEarnings, 60000);

    return () => clearInterval(interval);
  }, []);

  return { daily, total, error };
}
