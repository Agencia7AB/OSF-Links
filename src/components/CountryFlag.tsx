import React from 'react';

interface CountryFlagProps {
  countryCode: string;
  className?: string;
}

const CountryFlag: React.FC<CountryFlagProps> = ({ countryCode, className = "w-6 h-4" }) => {
  // Usar API de bandeiras do flagcdn
  const flagUrl = `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
  
  return (
    <img
      src={flagUrl}
      alt={`Bandeira ${countryCode}`}
      className={`${className} object-cover rounded-sm`}
      onError={(e) => {
        // Fallback para emoji se a imagem falhar
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const parent = target.parentElement;
        if (parent) {
          parent.innerHTML = '🌍';
        }
      }}
    />
  );
};

export default CountryFlag;