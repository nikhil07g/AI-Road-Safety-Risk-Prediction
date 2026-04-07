export interface TrafficData {
  trafficDensity: "low" | "medium" | "high";
  condition: string;
}

// This function will estimate traffic density based on coordinates
// Note: This requires Google Maps API with Places or Traffic Layer enabled
export async function getTrafficCondition(
  latitude: number,
  longitude: number,
  apiKey: string
): Promise<TrafficData> {
  try {
    // Using Google Maps Directions API as a proxy to estimate traffic
    // Get traffic data by requesting directions with departure_time=now
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${latitude},${longitude}&destination=${latitude + 0.01},${longitude + 0.01}&departure_time=now&key=${apiKey}`
    );

    if (!response.ok) throw new Error("Traffic API failed");

    const data = await response.json();

    if (
      data.routes &&
      data.routes.length > 0 &&
      data.routes[0].legs &&
      data.routes[0].legs.length > 0
    ) {
      const leg = data.routes[0].legs[0];
      const trafficDuration = leg.duration_in_traffic?.value || leg.duration.value;
      const normalDuration = leg.duration.value;

      // Calculate traffic ratio
      const ratio = trafficDuration / normalDuration;

      let trafficDensity: "low" | "medium" | "high" = "low";
      let condition = "Light traffic";

      if (ratio > 1.5) {
        trafficDensity = "high";
        condition = `Heavy traffic (${Math.round((ratio - 1) * 100)}% slower)`;
      } else if (ratio > 1.2) {
        trafficDensity = "medium";
        condition = `Moderate traffic (${Math.round((ratio - 1) * 100)}% slower)`;
      } else {
        trafficDensity = "low";
        condition = "Light traffic";
      }

      return { trafficDensity, condition };
    }

    return {
      trafficDensity: "medium",
      condition: "Unable to determine traffic conditions",
    };
  } catch (error) {
    console.error("Error fetching traffic data:", error);
    // Return default value on error
    return {
      trafficDensity: "medium",
      condition: "Unable to fetch traffic data",
    };
  }
}

// Alternative: Simple traffic estimation based on time of day
export function estimateTrafficByTime(): "low" | "medium" | "high" {
  const hour = new Date().getHours();

  // Rush hours: 7-9 AM, 4-7 PM
  if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
    return "high";
  }
  // Mid-day and evening
  if ((hour >= 10 && hour <= 15) || (hour >= 20 && hour <= 22)) {
    return "medium";
  }
  // Night and early morning
  return "low";
}
