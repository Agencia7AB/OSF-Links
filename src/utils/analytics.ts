interface LocationData {
  country: string;
  country_code: string;
  ip: string;
}

interface DeviceInfo {
  device: string;
  os: string;
  browser: string;
}

const getCountryName = async (countryCode: string): Promise<string> => {
  try {
    const response = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}`, {
      timeout: 3000
    });
    
    if (!response.ok) {
      throw new Error('Falha na requisição');
    }
    
    const data = await response.json();
    return data[0]?.name?.common || countryCode;
  } catch (error) {
    console.warn('Erro ao obter nome do país:', error);
    return countryCode;
  }
};

const getLocationData = async (): Promise<LocationData | null> => {
  // Verificar se já temos os dados no localStorage
  const cachedData = localStorage.getItem('userLocation');
  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      // Verificar se os dados não são muito antigos (24 horas)
      const cacheTime = new Date(parsed.timestamp);
      const now = new Date();
      const hoursDiff = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff < 24) {
        return {
          country: parsed.country,
          country_code: parsed.country_code,
          ip: parsed.ip
        };
      }
    } catch (error) {
      console.warn('Erro ao ler cache de localização:', error);
    }
  }

  // Fazer requisição para a API
  try {
    const response = await fetch('https://ipinfo.io/json?token=5dd56127c02307', {
      timeout: 5000 // 5 segundos de timeout
    });
    
    if (!response.ok) {
      throw new Error('Falha na requisição');
    }
    
    const data = await response.json();
    
    // Obter nome completo do país
    const countryCode = data.country || 'XX';
    const countryName = await getCountryName(countryCode);
    
    const locationData = {
      country: countryName,
      country_code: countryCode,
      ip: data.ip || 'Unknown'
    };

    // Salvar no localStorage com timestamp
    localStorage.setItem('userLocation', JSON.stringify({
      ...locationData,
      timestamp: new Date().toISOString()
    }));

    return locationData;
  } catch (error) {
    console.warn('Erro ao obter localização:', error);
    
    // Retornar dados padrão se a API falhar
    return {
      country: 'Unknown',
      country_code: 'XX',
      ip: 'Unknown'
    };
  }
};

const getDeviceInfo = (): DeviceInfo => {
  const userAgent = navigator.userAgent;
  
  // Detectar dispositivo
  let device = 'Desktop';
  if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    if (/iPad/i.test(userAgent)) {
      device = 'Tablet';
    } else {
      device = 'Mobile';
    }
  }

  // Detectar sistema operacional
  let os = 'Unknown';
  if (/Windows/i.test(userAgent)) os = 'Windows';
  else if (/Mac/i.test(userAgent)) os = 'macOS';
  else if (/Linux/i.test(userAgent)) os = 'Linux';
  else if (/Android/i.test(userAgent)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(userAgent)) os = 'iOS';

  // Detectar navegador
  let browser = 'Unknown';
  if (/Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)) browser = 'Chrome';
  else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = 'Safari';
  else if (/Edge/i.test(userAgent)) browser = 'Edge';
  else if (/Opera/i.test(userAgent)) browser = 'Opera';

  return { device, os, browser };
};

export const trackPageView = async (videoId: string) => {
  // Verificar se já foi rastreado nesta sessão para evitar duplicatas
  const sessionKey = `tracked_${videoId}_${Date.now().toString().slice(0, -5)}`; // Precisão de ~3 minutos
  const alreadyTracked = sessionStorage.getItem(sessionKey);
  
  if (alreadyTracked) {
    return; // Já foi rastreado recentemente
  }

  try {
    // Obter dados de localização (com cache)
    const locationData = await getLocationData();
    
    // Obter informações do dispositivo
    const deviceInfo = getDeviceInfo();
    
    // Importar Firebase apenas quando necessário
    const { collection, addDoc } = await import('firebase/firestore');
    const { db } = await import('../config/firebase');
    
    // Salvar no banco de dados
    await addDoc(collection(db, 'analytics'), {
      videoId,
      timestamp: new Date(),
      country: locationData?.country || 'Unknown',
      countryCode: locationData?.country_code || 'XX',
      device: deviceInfo.device,
      os: deviceInfo.os,
      browser: deviceInfo.browser,
      ip: locationData?.ip || 'Unknown',
      userAgent: navigator.userAgent
    });
    
    // Marcar como rastreado nesta sessão
    sessionStorage.setItem(sessionKey, 'true');
    
  } catch (error) {
    console.error('Erro ao rastrear visualização:', error);
    // Não bloquear a aplicação se o tracking falhar
  }
};