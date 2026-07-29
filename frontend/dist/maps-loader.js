(() => {
  const apiKey = "AIzaSyCfVIhzqJLziXyMkXOJRwLMaeoIxNZE78U";
  const defaultCenter = { lat: 17.385, lng: 78.4867 };
  let mapsReady;

  function getCurrentLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ ...defaultCenter, isPrecise: false });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve({
          lat: coords.latitude,
          lng: coords.longitude,
          isPrecise: true,
        }),
        () => resolve({ ...defaultCenter, isPrecise: false }),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    });
  }

  async function getWeather(location) {
    const query = new URLSearchParams({
      lat: location.lat.toString(),
      lon: location.lng.toString(),
    });
    const response = await fetch(`/api/weather?${query}`);
    if (!response.ok) throw new Error("Weather service request failed.");
    return response.json();
  }

  function addWeatherCard(container, location, weather) {
    const card = document.createElement("div");
    card.style.cssText = [
      "position:absolute", "top:12px", "left:12px", "z-index:2",
      "padding:10px 12px", "border-radius:8px", "background:rgba(255,255,255,.95)",
      "box-shadow:0 2px 8px rgba(0,0,0,.2)", "font:13px system-ui,sans-serif", "color:#1f2937",
    ].join(";");

    const locality = weather.name || "Your location";
    const condition = weather.weather?.[0]?.description || "Current conditions";
    const temperature = Math.round(weather.main?.temp ?? 0);
    card.innerHTML = `<strong>${locality}</strong><br>${temperature}°C · ${condition}<br><small>${location.isPrecise ? "Using your precise location" : "Using default location"}</small>`;
    container.appendChild(card);
  }

  function loadMaps() {
    if (mapsReady) return mapsReady;

    mapsReady = new Promise((resolve, reject) => {
      if (window.google?.maps) {
        resolve(window.google.maps);
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly`;
      script.async = true;
      script.onload = () => resolve(window.google.maps);
      script.onerror = () => reject(new Error("Google Maps could not be loaded."));
      document.head.appendChild(script);
    });

    return mapsReady;
  }

  async function mountRiskMap() {
    const message = [...document.querySelectorAll("p")].find(
      (node) => node.textContent?.trim() === "Google Maps API Not Configured"
    );
    if (!message) return;

    const mapPanel = message.closest(".relative");
    if (!mapPanel || mapPanel.dataset.mapMounted) return;
    mapPanel.dataset.mapMounted = "true";
    mapPanel.replaceChildren();

    const mapElement = document.createElement("div");
    mapElement.style.cssText = "height:100%;width:100%;min-height:360px";
    mapPanel.appendChild(mapElement);

    try {
      const [maps, location] = await Promise.all([loadMaps(), getCurrentLocation()]);
      const map = new maps.Map(mapElement, {
        center: location,
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
      });
      new maps.Marker({
        map,
        position: location,
        title: location.isPrecise ? "Your current location" : "Hyderabad road-risk overview",
      });

      window.dispatchEvent(new CustomEvent("road-risk-location", { detail: location }));
      try {
        const weather = await getWeather(location);
        localStorage.setItem("weather", weather.weather?.[0]?.main || "unknown");
        localStorage.setItem("temperature", String(weather.main?.temp ?? ""));
        window.dispatchEvent(new CustomEvent("road-risk-weather", { detail: weather }));
        addWeatherCard(mapPanel, location, weather);
      } catch (weatherError) {
        console.error(weatherError);
      }
    } catch (error) {
      mapPanel.dataset.mapMounted = "";
      mapPanel.textContent = "Google Maps could not be loaded. Check that the Maps JavaScript API is enabled for this key.";
      console.error(error);
    }
  }

  const observer = new MutationObserver(mountRiskMap);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountRiskMap, { once: true });
  } else {
    mountRiskMap();
  }
})();
