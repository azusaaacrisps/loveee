export interface WeatherData {
  temperature: number;
  condition: string;
  city: string;
  description: string;
  humidity: number;
  windSpeed: number;
}

// 判断是否是开发环境，开发环境走 Vite 代理避免 CORS 问题
const isDev = import.meta.env.DEV;

const weatherConditions: Record<number, string> = {
  0: '晴天',
  1: '晴',
  2: '多云',
  3: '阴天',
  45: '雾',
  48: '雾凇',
  51: '小雨',
  53: '中雨',
  55: '大雨',
  56: '冻雨',
  57: '冻雨',
  61: '小雨',
  63: '中雨',
  65: '大雨',
  66: '冻雨',
  67: '冻雨',
  71: '小雪',
  73: '中雪',
  75: '大雪',
  77: '雪粒',
  80: '阵雨',
  81: '阵雨',
  82: '暴雨',
  85: '阵雪',
  86: '阵雪',
  95: '雷雨',
  96: '雷雨',
  99: '雷雨',
};

const getWeatherCondition = (code: number): string => {
  return weatherConditions[code] || '未知';
};

// Open-Meteo 免费天气 API（不需要 API Key，支持 CORS）
const openMeteoByLocation = async (latitude: number, longitude: number): Promise<WeatherData> => {
  const baseUrl = isDev ? '/weather/open-meteo' : 'https://api.open-meteo.com';
  const response = await fetch(
    `${baseUrl}/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!response.ok) throw new Error('Open-Meteo API error');
  const data = await response.json();
  const current = data.current;
  const timezoneParts = data.timezone?.split('/') || [];
  let city = timezoneParts[1]?.replace('_', ' ') || '未知城市';
  if (city === 'China') city = '中国';
  return {
    temperature: Math.round(current.temperature_2m),
    condition: getWeatherCondition(current.weather_code),
    city,
    description: getWeatherCondition(current.weather_code),
    humidity: current.relative_humidity_2m ?? 50,
    windSpeed: Math.round(current.wind_speed_10m ?? 5),
  };
};

// Open-Meteo 城市名 → 坐标地理编码
const geocodeCity = async (cityName: string): Promise<{ latitude: number; longitude: number; city: string }> => {
  const baseUrl = isDev ? '/weather/geocoding' : 'https://geocoding-api.open-meteo.com';
  const response = await fetch(
    `${baseUrl}/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=zh`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!response.ok) throw new Error('Geocoding API error');
  const data = await response.json();
  if (!data.results || data.results.length === 0) throw new Error('未找到城市');
  const result = data.results[0];
  return {
    latitude: result.latitude,
    longitude: result.longitude,
    city: result.name || cityName,
  };
};

// WeatherAPI.com（需要 API Key）
const weatherApiByLocation = async (latitude: number, longitude: number): Promise<WeatherData> => {
  const response = await fetch(
    `https://api.weatherapi.com/v1/current.json?key=01e7c3a2649e4b0a942114155242807&q=${latitude},${longitude}&lang=zh`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!response.ok) throw new Error('WeatherAPI error');
  const data = await response.json();
  return {
    temperature: Math.round(data.current.temp_c),
    condition: data.current.condition.text,
    city: data.location.name,
    description: data.current.condition.text,
    humidity: data.current.humidity,
    windSpeed: data.current.wind_kph,
  };
};

// OpenWeatherMap（需要 API Key）
const openWeatherByLocation = async (latitude: number, longitude: number): Promise<WeatherData> => {
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=7453d6a45f35633b3d22412d972dd9b9&units=metric&lang=zh_cn`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!response.ok) throw new Error('OpenWeatherMap API error');
  const data = await response.json();
  return {
    temperature: Math.round(data.main.temp),
    condition: data.weather[0].description,
    city: data.name,
    description: data.weather[0].description,
    humidity: data.main.humidity,
    windSpeed: data.wind.speed,
  };
};

export const fetchWeatherByLocation = async (latitude: number, longitude: number): Promise<WeatherData> => {
  const apis = [
    () => openMeteoByLocation(latitude, longitude),
    () => weatherApiByLocation(latitude, longitude),
    () => openWeatherByLocation(latitude, longitude),
  ];

  for (const api of apis) {
    try {
      return await api();
    } catch (error) {
      console.warn('天气API失败，尝试下一个:', error instanceof Error ? error.message : error);
    }
  }

  // 全部失败，不再返回模拟数据
  throw new Error('无法获取天气数据，请检查网络');
};

export const fetchWeatherByCity = async (cityName: string): Promise<WeatherData> => {
  const apis = [
    // 1. 优先用 Open-Meteo：先地理编码获取坐标，再获取天气（免费、无 API Key）
    async () => {
      const geo = await geocodeCity(cityName);
      const weather = await openMeteoByLocation(geo.latitude, geo.longitude);
      return { ...weather, city: geo.city };
    },
    // 2. WeatherAPI.com
    async () => {
      const response = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=01e7c3a2649e4b0a942114155242807&q=${encodeURIComponent(cityName)}&lang=zh`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!response.ok) throw new Error('WeatherAPI error');
      const data = await response.json();
      return {
        temperature: Math.round(data.current.temp_c),
        condition: data.current.condition.text,
        city: data.location.name,
        description: data.current.condition.text,
        humidity: data.current.humidity,
        windSpeed: data.current.wind_kph,
      };
    },
    // 3. OpenWeatherMap
    async () => {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=7453d6a45f35633b3d22412d972dd9b9&units=metric&lang=zh_cn`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!response.ok) throw new Error('OpenWeatherMap API error');
      const data = await response.json();
      return {
        temperature: Math.round(data.main.temp),
        condition: data.weather[0].description,
        city: data.name,
        description: data.weather[0].description,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
      };
    },
  ];

  for (const api of apis) {
    try {
      return await api();
    } catch (error) {
      console.warn(`城市天气API失败，尝试下一个:`, error instanceof Error ? error.message : error);
    }
  }

  // 全部失败，不再返回模拟数据
  throw new Error(`${cityName} 天气获取失败，请检查网络`);
};

export const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      getLocationByIP().then(resolve).catch(reject);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        getLocationByIP().then(resolve).catch(() => {
          reject(new Error(`定位失败: ${error.message}`));
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
};

export const getLocationByIP = async (): Promise<{ latitude: number; longitude: number }> => {
  const ipApis = [
    async () => {
      const response = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('ipapi.co failed');
      const data = await response.json();
      if (!data.latitude || !data.longitude) throw new Error('无法获取位置信息');
      return { latitude: data.latitude, longitude: data.longitude };
    },
    async () => {
      const response = await fetch('https://api.ipgeolocation.io/ipgeo?apiKey=e4d09693f5a342d5b73ee0665c9ee83c', { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('ipgeolocation.io failed');
      const data = await response.json();
      return { latitude: data.latitude, longitude: data.longitude };
    },
    async () => {
      const response = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('ipify failed');
      const ipData = await response.json();
      const locationResponse = await fetch(`https://api.ip2location.io/?key=FB3EB84B634B42408AE8DA974048C663&ip=${ipData.ip}`, { signal: AbortSignal.timeout(5000) });
      if (!locationResponse.ok) throw new Error('ip2location failed');
      const data = await locationResponse.json();
      return { latitude: parseFloat(data.latitude), longitude: parseFloat(data.longitude) };
    },
  ];

  for (const api of ipApis) {
    try {
      return await api();
    } catch (error) {
      console.warn('IP定位API失败，尝试下一个:', error);
    }
  }

  console.warn('所有IP定位API均失败，使用默认位置（北京）');
  return {
    latitude: 39.9042,
    longitude: 116.4074,
  };
};
