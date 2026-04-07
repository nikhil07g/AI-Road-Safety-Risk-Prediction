export interface WeatherData {
  temperature: number;
  rainfall: "none" | "light" | "heavy";
  fogLevel: "low" | "medium" | "high";
  description: string;
}

// Using Open-Meteo API (free, no key required)
export async function getLiveWeather(
  latitude: number,
  longitude: number
): Promise<WeatherData> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,precipitation,weather_code,visibility&temperature_unit=celsius&wind_speed_unit=kmh`
    );

    if (!response.ok) throw new Error("Weather API failed");

    const data = await response.json();
    const current = data.current;

    // Convert weather code to rainfall status
    let rainfall: "none" | "light" | "heavy" = "none";
    const weatherCode = current.weather_code;
    
    // WMO Weather interpretation codes
    if (weatherCode >= 80 && weatherCode <= 82) rainfall = "light"; // Light rain
    if (weatherCode >= 51 && weatherCode <= 67) rainfall = "light"; // Drizzle to light rain
    if (weatherCode >= 71 && weatherCode <= 77) rainfall = "light"; // Snow
    if (weatherCode >= 80 && weatherCode <= 99) rainfall = "heavy"; // Showers and thunderstorms
    if (weatherCode === 95 || weatherCode === 96 || weatherCode === 99) rainfall = "heavy"; // Thunderstorm

    // Convert visibility to fog level (visibility in meters)
    let fogLevel: "low" | "medium" | "high" = "low";
    const visibility = current.visibility || 10000; // Default to 10km if not available
    
    if (visibility < 1000) fogLevel = "high"; // Less than 1km
    else if (visibility < 5000) fogLevel = "medium"; // 1-5km
    else fogLevel = "low"; // More than 5km

    const temperature = Math.round(current.temperature_2m * 10) / 10;

    return {
      temperature,
      rainfall,
      fogLevel,
      description: getWeatherDescription(weatherCode),
    };
  } catch (error) {
    console.error("Error fetching weather:", error);
    // Return default values on error
    return {
      temperature: 25,
      rainfall: "none",
      fogLevel: "low",
      description: "Unable to fetch live weather",
    };
  }
}

function getWeatherDescription(code: number): string {
  const descriptions: { [key: number]: string } = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Foggy with depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };

  return descriptions[code] || "Unknown conditions";
}

export async function getLocationFromBrowser(): Promise<[number, number] | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.log("Geolocation not supported");
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve([position.coords.latitude, position.coords.longitude]);
      },
      (error) => {
        console.log("Geolocation error:", error);
        resolve(null);
      },
      { timeout: 10000 }
    );
  });
}
