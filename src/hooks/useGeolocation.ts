import { useState, useCallback } from 'react';

interface GeolocationResult {
  country: string;
  climateType: string;
}

// Map latitude to climate type (simplified)
function getClimateFromLatitude(lat: number): string {
  const absLat = Math.abs(lat);
  
  if (absLat <= 10) return 'tropical';
  if (absLat <= 23.5) return 'tropical';
  if (absLat <= 35) return 'mediterranean';
  if (absLat <= 50) return 'temperate';
  if (absLat <= 60) return 'continental';
  return 'continental';
}

// Try multiple geocoding APIs for reliability
async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  // Try primary API first
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (response.ok) {
      const data = await response.json();
      if (data.countryName) return data.countryName;
    }
  } catch {
    console.log('Primary geocoding failed, trying fallback...');
  }

  // Fallback to Nominatim (OpenStreetMap)
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=3`,
      { 
        signal: AbortSignal.timeout(5000),
        headers: { 'Accept-Language': 'en' }
      }
    );
    if (response.ok) {
      const data = await response.json();
      if (data.address?.country) return data.address.country;
    }
  } catch {
    console.log('Fallback geocoding also failed');
  }

  return '';
}

export function useGeolocation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectLocation = useCallback(async (): Promise<GeolocationResult | null> => {
    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setError('Geolocation not supported');
        setIsLoading(false);
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log('Got coordinates:', latitude, longitude);
          
          const climateType = getClimateFromLatitude(latitude);
          const country = await reverseGeocode(latitude, longitude);
          
          console.log('Detected:', { country, climateType });
          setIsLoading(false);
          
          // Return result even if country is empty - climate is still useful
          resolve({ country, climateType });
        },
        (err) => {
          console.error('Geolocation error:', err);
          let errorMessage = 'Failed to get location';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Location permission denied';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Location unavailable';
              break;
            case err.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          setError(errorMessage);
          setIsLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 600000, // Cache for 10 minutes
        }
      );
    });
  }, []);

  return { detectLocation, isLoading, error };
}
