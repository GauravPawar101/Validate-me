import axios from "axios";
import { API_BACKEND_URL } from "@/config";

const withdrawAmount = async (amt: number, getToken: () => Promise<string | null>) => {
  try {
    const token = await getToken(); 

    if (!token) {
      alert("Authentication failed. Please log in again.");
      return;
    }

    const response = await axios.post(
      `${API_BACKEND_URL}/api/v1/amt`,
      { amt },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      }
    );

    if (response.status === 200) {
      alert(`Withdrawal successful! Updated total: ${response.data.updatedTotal}`);
    } else {
      alert(`Error: ${response.data.error}`);
    }
  } catch (error: any) {
    if (error.response && error.response.data) {
      alert(`Error: ${error.response.data.error}`);
    } else {
      alert("Failed to connect to the server.");
    }
    console.error("Error making withdrawal request:", error);
  }
};

export default withdrawAmount;
