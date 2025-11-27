import React, { useState } from 'react';

// Простa phone input с автозапълване на +359 за България
export default function PhoneInput({ value, onChange, placeholder = "+359 89 917 5548" }) {
  const [country, setCountry] = useState('BG');

  const countryData = {
    BG: { name: 'България', code: '+359' },
    GR: { name: 'Гърция', code: '+30' },
    RO: { name: 'Румъния', code: '+40' },
    RS: { name: 'Сърбия', code: '+381' },
    TR: { name: 'Турция', code: '+90' },
  };

  const handleCountryChange = (e) => {
    const newCountry = e.target.value;
    setCountry(newCountry);
    const newCode = countryData[newCountry].code;
    
    // Ако вече има текст, не го менять - само добави кода ако не е там
    if (!value.startsWith('+')) {
      onChange(newCode + ' ');
    }
  };

  const handlePhoneChange = (e) => {
    let input = e.target.value;
    
    // Премахни всички символи освен + и цифри
    input = input.replace(/[^\d+\s\-()]/g, '');
    
    // Максимум 15 символа (включително разделители)
    if (input.replace(/\D/g, '').length > 15) {
      return;
    }
    
    onChange(input);
  };

  const isValid = value && value.replace(/\D/g, '').length >= 9;

  return (
    <div className="form-group">
      <label>📱 Телефонен номер</label>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <select
          value={country}
          onChange={handleCountryChange}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontFamily: 'var(--font-family-base)',
            cursor: 'pointer',
            minWidth: '140px'
          }}
        >
          {Object.entries(countryData).map(([code, data]) => (
            <option key={code} value={code}>
              {data.name} {data.code}
            </option>
          ))}
        </select>
      </div>

      <div style={{ position: 'relative' }}>
        <input
          type="tel"
          value={value}
          onChange={handlePhoneChange}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '12px 40px 12px 12px',
            borderRadius: '6px',
            border: `1px solid ${value && !isValid ? 'var(--color-error)' : 'var(--color-border)'}`,
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontFamily: 'var(--font-family-base)',
            fontSize: 'var(--font-size-md)',
            transition: 'all 150ms ease'
          }}
        />
        
        {value && (
          <span
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '18px',
              cursor: 'default'
            }}
          >
            {isValid ? '✓' : '⚠️'}
          </span>
        )}
      </div>

      {value && !isValid && (
        <small
          style={{
            color: 'var(--color-error)',
            display: 'block',
            marginTop: '4px',
            fontSize: 'var(--font-size-xs)'
          }}
        >
          Минимум 9 цифри след кода на страната
        </small>
      )}
    </div>
  );
}