import React, { useState } from 'react';

const COUNTRIES = [
  { code: '+359', name: '🇧🇬 Bulgaria', pattern: /^\+359\d{9}$/ },
  { code: '+30', name: '🇬🇷 Greece', pattern: /^\+30\d{10}$/ },
  { code: '+49', name: '🇩🇪 Germany', pattern: /^\+49\d{10,11}$/ },
  { code: '+33', name: '🇫🇷 France', pattern: /^\+33\d{9}$/ },
  { code: '+39', name: '🇮🇹 Italy', pattern: /^\+39\d{10}$/ },
  { code: '+34', name: '🇪🇸 Spain', pattern: /^\+34\d{9}$/ },
  { code: '+41', name: '🇨🇭 Switzerland', pattern: /^\+41\d{9}$/ },
  { code: '+43', name: '🇦🇹 Austria', pattern: /^\+43\d{10,11}$/ },
  { code: '+44', name: '🇬🇧 UK', pattern: /^\+44\d{10}$/ },
];

export default function PhoneInput({ value, onChange, placeholder = '' }) {
  const [country, setCountry] = useState('+359');

  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\s/g, '');
    
    // Auto-format phone with spaces
    if (val.length > 0) {
      // Remove non-digits except the + at start
      val = val.replace(/[^\d+]/g, '');
      
      // Format based on country
      if (country === '+359' && val.length >= 3) {
        // +359 89 917 5548
        val = `${country} ${val.slice(3, 5)} ${val.slice(5, 8)} ${val.slice(8, 12)}`.trim();
      } else if (val.startsWith(country)) {
        // Keep country code + spaces
        val = `${country} ${val.slice(country.length)}`;
      }
    }

    onChange(val);
  };

  const handleCountryChange = (e) => {
    const newCountry = e.target.value;
    setCountry(newCountry);
    // Reset phone when changing country
    onChange('');
  };

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <div style={{ flex: '0 0 120px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#6b4423', fontSize: '14px' }}>
          🌍 Държава
        </label>
        <select 
          value={country} 
          onChange={handleCountryChange}
          style={{
            width: '100%',
            padding: '12px 14px',
            border: '2px solid #e8dfd5',
            borderRadius: '8px',
            background: '#faf7f2',
            color: '#3d3d3d',
            cursor: 'pointer'
          }}
        >
          {COUNTRIES.map(c => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </div>
      <div style={{ flex: 1 }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#6b4423', fontSize: '14px' }}>
          📱 Телефон
        </label>
        <input
          type="tel"
          value={value}
          onChange={handlePhoneChange}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '12px 14px',
            border: '2px solid #e8dfd5',
            borderRadius: '8px',
            background: '#faf7f2',
            color: '#3d3d3d',
            fontSize: '14px',
            fontFamily: 'inherit',
            transition: 'all 0.3s',
            boxSizing: 'border-box'
          }}
        />
      </div>
    </div>
  );
}
