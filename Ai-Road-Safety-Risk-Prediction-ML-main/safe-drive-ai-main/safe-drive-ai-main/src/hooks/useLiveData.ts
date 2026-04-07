import { useEffect, useState } from "react";
import type { PredictionInput } from "@/lib/prediction";
import { getLiveWeather, getLocationFromBrowser } from "@/lib/weather";
import { getTrafficCondition, estimateTrafficByTime } from "@/lib/traffic";

export interface LiveDataStatus {
  isLoading: boolean;
  weatherFetched: boolean;
  trafficFetched: boolean;
  error: string | null;
}

export function useLiveData(
  onUpdate: (updates: Partial<PredictionInput>) => void
) {
  const [status, setStatus] = useState<LiveDataStatus>({
    isLoading: false,
    weatherFetched: false,
    trafficFetched: false,
    error: null,
  });

  useEffect(() => {
    const fetchLiveData = async () => {
      setStatus((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Get user location
        const location = await getLocationFromBrowser();

        if (!location) {
          setStatus((prev) => ({
            ...prev,
            error: "Location permission denied. Using defaults.",
            isLoading: false,
          }));
          return;
        }

        const [latitude, longitude] = location;

        // Fetch live weather
        const weather = await getLiveWeather(latitude, longitude);
        onUpdate({
          temperature: weather.temperature,
          rainfall: weather.rainfall,
          fogLevel: weather.fogLevel,
        });

        // Fetch or estimate traffic
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        let trafficDensity: "low" | "medium" | "high";

        if (apiKey) {
          const traffic = await getTrafficCondition(latitude, longitude, apiKey);
          trafficDensity = traffic.trafficDensity;
        } else {
          trafficDensity = estimateTrafficByTime();
        }

        onUpdate({ trafficDensity });

        setStatus((prev) => ({
          ...prev,
          isLoading: false,
          weatherFetched: true,
          trafficFetched: true,
        }));
      } catch (error) {
        console.error("Error fetching live data:", error);
        setStatus((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to fetch live data",
        }));
      }
    };

    // Fetch live data on mount
    fetchLiveData();

    // Refresh every 5 minutes
    const interval = setInterval(fetchLiveData, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [onUpdate]);

  return status;
}
