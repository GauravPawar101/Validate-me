import axios from "axios";
import { lookup } from "dns/promises";

// Function to resolve hostname to IP (if needed)
async function resolveIP(target: string): Promise<string | null> {
  if (target.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    return target; // Already an IP
  }

  try {
    const { address } = await lookup(target);
    return address;
  } catch (error) {
    console.error("DNS Lookup Failed:", error);
    return null;
  }
}

// Function to fetch server location
export async function getServerLocation(target: string) {
  try {
    const ip = await resolveIP(target);
    if (!ip) {
      throw new Error("Could not resolve hostname to IP.");
    }

    const { data } = await axios.get(`http://ip-api.com/json/${ip}`);
    
    return {
      ip: data.query,
      country: data.country,
      region: data.regionName,
      city: data.city,
      isp: data.isp,
      latitude: data.lat,
      longitude: data.lon,
    };
  } catch (error) {
    console.error("Error fetching server location:", error);
    return null;
  }
}
