import React, { useState, useEffect } from 'react';
import {
  Calendar, TrendingUp, Globe, Monitor, BarChart3,
  ChevronDown, ChevronUp, Download, Clock
} from 'lucide-react';
import {
  collection, query, where, getDocs, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Analytics as AnalyticsType, Video } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import CountryFlag from './CountryFlag';

interface AnalyticsProps {
  videos: Video[];
}

type TimeFilter = '24h' | '2d' | '7d' | '30d' | 'custom';

interface CountryData {
  country: string;
  countryCode: string;
  clicks: number;
}

interface DeviceData {
  name: string;
  value: number;
  color: string;
}

interface HourlyData {
  hour: string;
  clicks: number;
}

const Analytics: React.FC<AnalyticsProps> = ({ videos }) => {
  const [selectedVideo, setSelectedVideo] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsType[]>([]);
  const [dayAnalytics, setDayAnalytics] = useState<AnalyticsType[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [showAllCountries, setShowAllCountries] = useState(false);

  const getDateRange = () => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (timeFilter) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '2d':
        startDate.setDate(now.getDate() - 2);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'custom':
        startDate = new Date(`${customStartDate}T00:00:00`);
        endDate = new Date(`${customEndDate}T23:59:59`);
        return { startDate, endDate };
    }
    return { startDate, endDate: now };
  };

  const loadAnalytics = async () => {
    setLoading(true);
    const { startDate, endDate } = getDateRange();
    try {
      let q = query(
        collection(db, 'analytics'),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        orderBy('timestamp', 'desc')
      );
      if (selectedVideo !== 'all') {
        q = query(
          collection(db, 'analytics'),
          where('videoId', '==', selectedVideo),
          where('timestamp', '>=', Timestamp.fromDate(startDate)),
          where('timestamp', '<=', Timestamp.fromDate(endDate)),
          orderBy('timestamp', 'desc')
        );
      }
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      })) as AnalyticsType[];
      setAnalytics(data);
    } catch (err) {
      console.error('Erro ao carregar analytics:', err);
    }
    setLoading(false);
  };

  const loadDayAnalytics = async () => {
    setLoadingDay(true);
    try {
      const dayStart = new Date(`${selectedDate}T00:00:00`);
      const dayEnd = new Date(`${selectedDate}T23:59:59`);
      let q = query(
        collection(db, 'analytics'),
        where('timestamp', '>=', Timestamp.fromDate(dayStart)),
        where('timestamp', '<=', Timestamp.fromDate(dayEnd)),
        orderBy('timestamp', 'desc')
      );
      if (selectedVideo !== 'all') {
        q = query(
          collection(db, 'analytics'),
          where('videoId', '==', selectedVideo),
          where('timestamp', '>=', Timestamp.fromDate(dayStart)),
          where('timestamp', '<=', Timestamp.fromDate(dayEnd)),
          orderBy('timestamp', 'desc')
        );
      }
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      })) as AnalyticsType[];
      setDayAnalytics(data);
    } catch (err) {
      console.error('Erro ao carregar dia:', err);
    }
    setLoadingDay(false);
  };

  useEffect(() => {
    loadAnalytics();
  }, [selectedVideo, timeFilter, customStartDate, customEndDate]);

  useEffect(() => {
    loadDayAnalytics();
  }, [selectedDate, selectedVideo]);

  // Processar dados por país
  const countryData: CountryData[] = analytics.reduce((acc, item) => {
    const existing = acc.find(c => c.countryCode === item.countryCode);
    if (existing) {
      existing.clicks++;
    } else {
      acc.push({
        country: item.country,
        countryCode: item.countryCode,
        clicks: 1
      });
    }
    return acc;
  }, [] as CountryData[]).sort((a, b) => b.clicks - a.clicks);

  // Processar dados por dispositivo
  const deviceData: DeviceData[] = analytics.reduce((acc, item) => {
    const existing = acc.find(d => d.name === item.device);
    if (existing) {
      existing.value++;
    } else {
      acc.push({
        name: item.device,
        value: 1,
        color: item.device === 'Mobile' ? '#00DBD9' : 
               item.device === 'Desktop' ? '#DBDB00' : '#10b981'
      });
    }
    return acc;
  }, [] as DeviceData[]);

  // Processar dados por hora (gráfico principal)
  const hourlyData: HourlyData[] = [];
  const { startDate, endDate } = getDateRange();
  
  if (timeFilter === '24h') {
    // Agrupar por hora nas últimas 24h
    for (let i = 23; i >= 0; i--) {
      const hour = new Date();
      hour.setHours(hour.getHours() - i);
      const hourStr = hour.getHours().toString().padStart(2, '0') + ':00';
      
      const clicks = analytics.filter(item => {
        const itemHour = new Date(item.timestamp);
        return itemHour.getHours() === hour.getHours() &&
               itemHour.getDate() === hour.getDate();
      }).length;
      
      hourlyData.push({ hour: hourStr, clicks });
    }
  } else {
    // Agrupar por dia
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const dayStr = day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      const clicks = analytics.filter(item => {
        const itemDay = new Date(item.timestamp);
        return itemDay.toDateString() === day.toDateString();
      }).length;
      
      hourlyData.push({ hour: dayStr, clicks });
    }
  }

  // Processar dados por hora do dia específico
  const dailyHourlyData: HourlyData[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const hourStr = hour.toString().padStart(2, '0') + ':00';
    const clicks = dayAnalytics.filter(item => {
      const itemHour = new Date(item.timestamp);
      return itemHour.getHours() === hour;
    }).length;
    
    dailyHourlyData.push({ hour: hourStr, clicks });
  }

  const topCountries = showAllCountries ? countryData : countryData.slice(0, 10);

  // Função para baixar CSV dos países
  const downloadCountriesCSV = () => {
    const csvContent = [
      ['Posição', 'País', 'Código do País', 'Cliques'],
      ...countryData.map((country, index) => [
        index + 1,
        country.country,
        country.countryCode,
        country.clicks
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics_paises_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Função para baixar CSV das horas do dia
  const downloadDailyHoursCSV = () => {
    const csvContent = [
      ['Hora', 'Cliques'],
      ...dailyHourlyData.map(item => [item.hour, item.clicks])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics_horas_${selectedDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <BarChart3 className="mr-3 text-[#00DBD9]" />
          Analytics
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Seletor de Vídeo */}
          <select
            value={selectedVideo}
            onChange={(e) => setSelectedVideo(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00DBD9]"
          >
            <option value="all">Todos os vídeos</option>
            {videos.map(video => (
              <option key={video.id} value={video.id}>{video.title}</option>
            ))}
          </select>

          {/* Filtro de Tempo */}
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus-ring-[#00DBD9]"
          >
            <option value="24h">Últimas 24 horas</option>
            <option value="2d">Últimos 2 dias</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>
      </div>

      {/* Filtro de Data Personalizado */}
      {timeFilter === 'custom' && (
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center space-x-2">
            <Calendar className="text-gray-400" size={20} />
            <label className="text-gray-400">De:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-[#00DBD9]"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-gray-400">Até:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-[#00DBD9]"
            />
          </div>
        </div>
      )}

      {/* Nova seção - Análise de um dia específico */}
      <div className="p-6 rounded-xl border border-gray-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Clock className="mr-2 text-[#00DBD9]" size={20} />
            Cliques por Hora - Dia Específico
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="text-gray-400" size={16} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-[#00DBD9]"
              />
            </div>
            <button
              onClick={downloadDailyHoursCSV}
              className="flex items-center px-3 py-2 bg-[#00DBD9] hover:bg-[#5ff2ef] text-black rounded-lg transition-colors text-sm"
            >
              <Download size={16} className="mr-2" />
              CSV
            </button>
          </div>
        </div>
        
        {loadingDay ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00DBD9]"></div>
          </div>
        ) : (
          <>
            <div className="h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyHourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="hour" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }} 
                  />
                  <Bar dataKey="clicks" fill="#00DBD9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center text-gray-400 text-sm">
              Total de cliques no dia {new Date(selectedDate).toLocaleDateString('pt-BR')}: {dayAnalytics.length}
            </div>
          </>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00DBD9]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Cliques */}
          <div className="p-6 rounded-xl border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <TrendingUp className="mr-2 text-[#00DBD9]" size={20} />
              Cliques {timeFilter === '24h' ? 'por Hora' : 'por Dia'}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="hour" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }} 
                  />
                  <Bar dataKey="clicks" fill="#00DBD9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico de Dispositivos */}
          <div className="p-6 rounded-xl border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Monitor className="mr-2 text-[#00DBD9]" size={20} />
              Dispositivos
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#FFFFFF'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center space-x-4 mt-4">
              {deviceData.map((device, index) => (
                <div key={index} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: device.color }}
                  />
                  <span className="text-gray-200 text-sm">
                    {device.name} ({device.value})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabela de Países */}
          <div className="lg:col-span-2 p-6 rounded-xl border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Globe className="mr-2 text-[#00DBD9]" size={20} />
                Países ({countryData.length} total)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadCountriesCSV}
                  className="flex items-center px-3 py-1 bg-[#00DBD9] hover:bg-[#7ffffd] text-black rounded-lg transition-colors text-sm"
                >
                  <Download size={16} className="mr-1" />
                  CSV
                </button>
                {countryData.length > 10 && (
                  <button
                    onClick={() => setShowAllCountries(!showAllCountries)}
                    className="flex items-center px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors text-sm"
                  >
                    {showAllCountries ? (
                      <>
                        <ChevronUp size={16} className="mr-1" />
                        Mostrar menos
                      </>
                    ) : (
                      <>
                        <ChevronDown size={16} className="mr-1" />
                        Ver todos
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">#</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">País</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Cliques</th>
                  </tr>
                </thead>
                <tbody>
                  {topCountries.map((country, index) => (
                    <tr key={country.countryCode} className="border-b border-gray-800 hover:bg-gray-800">
                      <td className="py-3 px-4 text-gray-300">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <CountryFlag countryCode={country.countryCode} />
                          <span className="text-white">{country.country}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="bg-[#00DBD9] text-black px-2 py-1 rounded-full text-sm font-medium">
                          {country.clicks}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {countryData.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Nenhum dado encontrado para o período selecionado.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-gray-800">
          <div className="text-2xl font-bold text-white">{analytics.length}</div>
          <div className="text-gray-400 text-sm">Total de Cliques</div>
        </div>
        <div className="p-4 rounded-lg border border-gray-800">
          <div className="text-2xl font-bold text-white">{countryData.length}</div>
          <div className="text-gray-400 text-sm">Países Únicos</div>
        </div>
        <div className="p-4 rounded-lg border border-gray-800">
          <div className="text-2xl font-bold text-white">{deviceData.length}</div>
          <div className="text-gray-400 text-sm">Tipos de Dispositivo</div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;