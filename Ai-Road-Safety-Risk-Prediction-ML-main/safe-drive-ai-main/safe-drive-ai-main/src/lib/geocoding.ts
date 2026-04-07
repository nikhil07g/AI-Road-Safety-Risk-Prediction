export interface GeocodeResult {
  lat: number;
  lng: number;
  name: string;
  formattedAddress: string;
}

// Predefined locations for quick reference
const commonLocations: { [key: string]: GeocodeResult } = {
  // Major cities - Multiple aliases for each
  hyderabad: { lat: 17.3850, lng: 78.4867, name: "Hyderabad", formattedAddress: "Hyderabad, Telangana, India" },
  "hyderabad city": { lat: 17.3850, lng: 78.4867, name: "Hyderabad", formattedAddress: "Hyderabad, Telangana, India" },
  
  vijayawada: { lat: 16.5062, lng: 80.6479, name: "Vijayawada", formattedAddress: "Vijayawada, Andhra Pradesh, India" },
  vijaywada: { lat: 16.5062, lng: 80.6479, name: "Vijayawada", formattedAddress: "Vijayawada, Andhra Pradesh, India" },
  "vijayawada city": { lat: 16.5062, lng: 80.6479, name: "Vijayawada", formattedAddress: "Vijayawada, Andhra Pradesh, India" },
  
  kurnool: { lat: 15.8281, lng: 78.8353, name: "Kurnool", formattedAddress: "Kurnool, Andhra Pradesh, India" },
  "kurnool city": { lat: 15.8281, lng: 78.8353, name: "Kurnool", formattedAddress: "Kurnool, Andhra Pradesh, India" },
  "kurnool district": { lat: 15.8281, lng: 78.8353, name: "Kurnool", formattedAddress: "Kurnool, Andhra Pradesh, India" },
  
  secunderabad: { lat: 17.3668, lng: 78.5253, name: "Secunderabad", formattedAddress: "Secunderabad, Telangana, India" },
  
  // Hyderabad zones
  "nh-44": { lat: 17.385, lng: 78.486, name: "National Highway 44", formattedAddress: "National Highway 44, Hyderabad" },
  "national highway 44": { lat: 17.385, lng: 78.486, name: "National Highway 44", formattedAddress: "National Highway 44, Hyderabad" },
  "ring road": { lat: 17.445, lng: 78.391, name: "Ring Road Junction", formattedAddress: "Ring Road Junction, Hyderabad" },
  "airport road": { lat: 17.240, lng: 78.429, name: "Airport Road", formattedAddress: "Airport Road, Hyderabad" },
  "old city": { lat: 17.361, lng: 78.474, name: "Old City Area", formattedAddress: "Charminar Area, Hyderabad" },
  "it corridor": { lat: 17.427, lng: 78.342, name: "IT Corridor", formattedAddress: "HITEC City, Hyderabad" },
  "lake drive": { lat: 17.423, lng: 78.458, name: "Lake Drive Road", formattedAddress: "Osman Sagar, Hyderabad" },
  gachibowli: { lat: 17.4406, lng: 78.3796, name: "Gachibowli", formattedAddress: "Gachibowli, Hyderabad" },
  "kukatpally": { lat: 17.4750, lng: 78.3965, name: "Kukatpally", formattedAddress: "Kukatpally, Hyderabad" },
  "industrial zone": { lat: 17.520, lng: 78.380, name: "Industrial Zone Highway", formattedAddress: "Industrial Zone Highway, Hyderabad" },
  "suburban bypass": { lat: 17.300, lng: 78.550, name: "Suburban Bypass", formattedAddress: "Suburban Bypass, Hyderabad" },
};

// Hyderabad city bounds
const HYDERABAD_BOUNDS = {
  north: 17.65,
  south: 17.0,
  east: 78.75,
  west: 78.0,
};

// Check if coordinates are within Hyderabad region
function isInHyderabadRegion(lat: number, lng: number): boolean {
  return (
    lat >= HYDERABAD_BOUNDS.south &&
    lat <= HYDERABAD_BOUNDS.north &&
    lng >= HYDERABAD_BOUNDS.west &&
    lng <= HYDERABAD_BOUNDS.east
  );
}

export async function geocodeLocation(
  query: string,
  apiKey: string,
  enforceHyderabadBounds: boolean = false
): Promise<GeocodeResult | null> {
  // Check predefined locations first (faster & more accurate)
  const queryLower = query.toLowerCase().trim();
  
  // Exact match first
  if (commonLocations[queryLower]) {
    return commonLocations[queryLower];
  }

  // Fuzzy match - check if query contains or is contained in any location name
  for (const [key, location] of Object.entries(commonLocations)) {
    if (key.includes(queryLower) || queryLower.includes(key) || 
        location.name.toLowerCase().includes(queryLower) || 
        queryLower.includes(location.name.toLowerCase())) {
      return location;
    }
  }

  // Check if it's already coordinates
  if (query.includes(",")) {
    const parts = query.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      // Validate coordinates are in Hyderabad region (if enforced)
      if (enforceHyderabadBounds && !isInHyderabadRegion(parts[0], parts[1])) {
        console.warn("Coordinates outside Hyderabad region");
        return null;
      }
      return {
        lat: parts[0],
        lng: parts[1],
        name: `${parts[0].toFixed(4)}, ${parts[1].toFixed(4)}`,
        formattedAddress: `Latitude: ${parts[0].toFixed(4)}, Longitude: ${parts[1].toFixed(4)}`,
      };
    }
  }

  // Use Google Maps Geocoding API
  if (!apiKey) {
    console.warn("Google Maps API key not configured");
    return null;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        query
      )}&region=in&key=${apiKey}`
    );

    if (!response.ok) throw new Error("Geocoding API failed");

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;

      // Check if location is within Hyderabad bounds (if enforced)
      if (enforceHyderabadBounds && !isInHyderabadRegion(location.lat, location.lng)) {
        console.warn(`"${query}" is outside Hyderabad region. Please enter a location in Hyderabad/Telangana area.`);
        return null;
      }

      return {
        lat: location.lat,
        lng: location.lng,
        name: result.formatted_address.split(",")[0], // First part of address
        formattedAddress: result.formatted_address,
      };
    }

    return null;
  } catch (error) {
    console.error("Error geocoding location:", error);
    return null;
  }
}

export async function geocodeLocationWithSuggestions(
  query: string,
  apiKey: string
): Promise<GeocodeResult[]> {
  // Return predefined matches first
  const queryLower = query.toLowerCase().trim();
  const suggestions: GeocodeResult[] = [];

  // Find matching predefined locations (all are in Hyderabad)
  Object.entries(commonLocations).forEach(([key, value]) => {
    if (key.includes(queryLower) || value.name.toLowerCase().includes(queryLower)) {
      suggestions.push(value);
    }
  });

  if (suggestions.length > 0) {
    return suggestions;
  }

  // Try Google Maps API for suggestions
  if (!apiKey) return [];

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        query
      )}&region=in&components=country:IN&key=${apiKey}`
    );

    if (!response.ok) throw new Error("Geocoding API failed");

    const data = await response.json();

    if (data.results) {
      // Filter results to only include those in Hyderabad region
      return data.results
        .filter((result: any) => {
          const lat = result.geometry.location.lat;
          const lng = result.geometry.location.lng;
          return isInHyderabadRegion(lat, lng);
        })
        .slice(0, 5)
        .map((result: any) => ({
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          name: result.formatted_address.split(",")[0],
          formattedAddress: result.formatted_address,
        }));
    }
  } catch (error) {
    console.error("Error getting geocoding suggestions:", error);
  }

  return [];
}

export function isValidLocation(location: GeocodeResult | null): boolean {
  return location !== null && !isNaN(location.lat) && !isNaN(location.lng);
}
