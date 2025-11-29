import React, { useState, useEffect } from 'react';
import './App.css';
import PhoneInput from './components/PhoneInput';
import Toast from './components/Toast';
import {
  addReservation,
  getClientByPhone,
  addClient,
  updateClientVisits,
  updateReservationStatus,
  deleteReservation,
  subscribeToReservations,
  signUpManager,
  signInManager,
  signOutManager,
  onAuthChange
} from './firebase';



export default function App() {
  const [screen, setScreen] = useState('loading');
  const [authTab, setAuthTab] = useState('signin');
  const [user, setUser] = useState(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');


  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);


  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);


  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('19:30');
  const [partySize, setPartySize] = useState(4);
  const [tableNumber, setTableNumber] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);


  const getTodayIso = () => new Date().toISOString().split('T')[0];


  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };


  const resetReservationForm = () => {
    setClientName('');
    setClientPhone('');
    setTableNumber('');
    setDescription('');
    setSelectedClient(null);
    setTime('19:30');
    setDate(getTodayIso());
    setPartySize(4);
  };


  const getTodaySummary = () => {
    const confirmed = reservations.filter(r => r.status === 'confirmed').length;
    const pending = reservations.filter(r => r.status === 'pending').length;
    const noshow = reservations.filter(r => r.status === 'no-show').length;
    return { confirmed, pending, noshow, total: reservations.length };
  };


  const getMinDate = () => getTodayIso();


  // Load restaurant name from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('restaurantName');
    if (saved) {
      console.log('Loaded restaurant from localStorage:', saved);
      setRestaurantName(saved);
    }
  }, []);


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && screen !== 'auth') {
        if (e.key === 'n') {
          e.preventDefault();
          setScreen('add-reservation');
          showToast('💡 Нова резервация (Ctrl+N)', 'info');
        } else if (e.key === 'k') {
          e.preventDefault();
          setScreen('client-lookup');
          showToast('💡 Търси клиент (Ctrl+K)', 'info');
        }
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [screen]);


  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthChange((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setScreen('dashboard');
      } else {
        setUser(null);
        setScreen('auth');
      }
    });
    return () => unsubscribe();
  }, []);


  // Subscribe към резервации
  useEffect(() => {
    if (screen === 'dashboard' && restaurantName) {
      setReservationsLoading(true);
      const unsubscribe = subscribeToReservations(restaurantName, (res) => {
        const normalized = res
          .map((r) => {
            let normalizedDate;
            if (!r.date) {
              normalizedDate = getTodayIso();
            } else if (typeof r.date === 'string') {
              normalizedDate = r.date.split('T')[0];
            } else {
              normalizedDate = new Date(r.date).toISOString().split('T')[0];
            }
            return {
              ...r,
              date: normalizedDate
            };
          })
          .sort((a, b) => {
            if (a.date === b.date) {
              return (a.time || '').localeCompare(b.time || '');
            }
            return a.date.localeCompare(b.date);
          });
        setReservations(normalized);
        setReservationsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [screen, restaurantName]);


  // Real-time филтър
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredReservations(reservations);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = reservations.filter((res) =>
        (res.client_name || '').toLowerCase().includes(term) ||
        (res.client_phone || '').includes(term) ||
        (res.table_number || '').toLowerCase().includes(term)
      );
      setFilteredReservations(filtered);
    }
  }, [searchTerm, reservations]);


  const handleSignUp = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast('❌ Паролите не съвпадат', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('❌ Паролата трябва да е поне 6 символа', 'error');
      return;
    }
    try {
      setLoading(true);
      await signUpManager(email, password);
      if (restaurantName.trim()) {
        localStorage.setItem('restaurantName', restaurantName);
      }
      showToast('✓ Регистрацията е успешна!', 'success');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setAuthTab('signin');
    } catch (err) {
      showToast('❌ Грешка: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };


  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await signInManager(email, password);
      if (restaurantName.trim()) {
        localStorage.setItem('restaurantName', restaurantName);
      }
      showToast('✓ Успешен вход!', 'success');
      setEmail('');
      setPassword('');
    } catch (err) {
      showToast('❌ Грешка: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };


  const handleSignOut = async () => {
    try {
      await signOutManager();
      localStorage.removeItem('restaurantName');
      console.log('Cleared restaurant from localStorage');
      setUser(null);
      setScreen('auth');
      setRestaurantName('');
      resetReservationForm();
      setReservations([]);
      setFilteredReservations([]);
      setSearchTerm('');
      showToast('✓ Успешен изход', 'info');
    } catch (err) {
      showToast('❌ Грешка при изход', 'error');
    }
  };


  const handlePhoneLookup = async () => {
    if (!clientPhone) {
      showToast('❌ Въведете телефонен номер', 'error');
      return;
    }
    try {
      setLoading(true);
      const client = await getClientByPhone(clientPhone);
      if (client) {
        setSelectedClient(client);
        setClientName(client.name);
        const vipBadge = client.total_visits >= 10 ? ' 👑' : '';
        showToast(
          `✓ ${client.name} от ${client.city} | ${client.total_visits} посещения${vipBadge}`,
          'success'
        );
      } else {
        setSelectedClient(null);
        showToast('ℹ️ Нов клиент', 'info');
      }
    } catch (err) {
      showToast('❌ Грешка: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };


  const handleAddReservation = async (e) => {
    e.preventDefault();
    if (!clientName || !clientPhone || !date || !time || !tableNumber) {
      showToast('❌ Попълнете всички полета', 'error');
      return;
    }
    const phoneClean = clientPhone.replace(/\s+/g, '');
    if (phoneClean.length < 6) {
      showToast('❌ Телефонният номер изглежда твърде кратък', 'error');
      return;
    }
    try {
      setLoading(true);
      await addReservation({
        restaurant_name: restaurantName,
        client_name: clientName,
        client_phone: clientPhone,
        date: date,
        time: time,
        party_size: parseInt(partySize, 10),
        table_number: tableNumber,
        description: description,
        status: 'pending'
      });
      if (selectedClient) {
        await updateClientVisits(
          selectedClient.id,
          (selectedClient.total_visits || 0) + 1
        );
      } else {
        await addClient({
          name: clientName,
          phone: clientPhone,
          city: 'Неизвестен',
          favorite_table: tableNumber,
          special_notes: ''
        });
      }
      showToast(`✓ Резервация за ${clientName} в ${time}`, 'success');
      resetReservationForm();
      setScreen('dashboard');
    } catch (err) {
      showToast('❌ Грешка: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };


  const handleStatusChange = async (reservationId, newStatus) => {
    try {
      await updateReservationStatus(reservationId, newStatus);
      showToast('✓ Статусът е обновен', 'success');
    } catch (err) {
      showToast('❌ Грешка: ' + err.message, 'error');
    }
  };


  const handleDelete = async (reservationId) => {
    if (window.confirm('Сигурни ли сте че искате да изтриете резервацията?')) {
      try {
        await deleteReservation(reservationId);
        showToast('✓ Резервацията е изтрита', 'success');
      } catch (err) {
        showToast('❌ Грешка: ' + err.message, 'error');
      }
    }
  };


  if (screen === 'loading') {
    return (
      <div className="container loading-screen">
        <div className="loading">
          <h1>🍽️ ReservePro</h1>
          <p>⏳ Зареждане...</p>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }


  if (screen === 'auth') {
    return (
      <div className="container auth-screen">
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        <div className="auth-box">
          <h1>🍽️ ReservePro</h1>
          <p className="auth-subtitle">Управление на резервации за ресторанти</p>
          <div className="auth-tabs">
            <button
              className={`tab ${authTab === 'signin' ? 'active' : ''}`}
              onClick={() => setAuthTab('signin')}
              type="button"
            >
              🔑 Вход
            </button>
            <button
              className={`tab ${authTab === 'signup' ? 'active' : ''}`}
              onClick={() => setAuthTab('signup')}
              type="button"
            >
              ✍️ Регистрация
            </button>
          </div>
          {authTab === 'signin' ? (
            <form onSubmit={handleSignIn}>
              <div className="form-group">
                <label>📧 Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>🔒 Парола</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Парола"
                  required
                />
              </div>
              <div className="form-group">
                <label>🏪 Име на ресторант (опционално)</label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="Име на вашия ресторант"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? '⏳ Влизане...' : '🔓 Вход'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp}>
              <div className="form-group">
                <label>📧 Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>🔒 Парола (минимум 6 символа)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Парола"
                  required
                />
              </div>
              <div className="form-group">
                <label>🔒 Потвърдете парола</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Повторете парола"
                  required
                />
              </div>
              <div className="form-group">
                <label>🏪 Име на ресторант (опционално)</label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="Име на вашия ресторант"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? '⏳ Регистриране...' : '✍️ Регистрирай се'}
              </button>
            </form>
          )}
          <div className="auth-hints">
            <p>💡 <strong>Бърз старт:</strong></p>
            <ul>
              <li>Ctrl+N = нова резервация</li>
              <li>Ctrl+K = търси клиент</li>
              <li>Местност номер = "+359 89 917 5548"</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }


  if (screen === 'dashboard') {
    const summary = getTodaySummary();
    return (
      <div className="container dashboard">
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        <header className="header">
          <div className="header-left">
            <h1>📋 {restaurantName || 'ReservePro'}</h1>
            <p className="header-date">
              {new Date().toLocaleDateString('bg-BG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <button className="btn btn-secondary" onClick={handleSignOut} title="Изход (Ctrl+Shift+Q)">
            👤 Изход
          </button>
        </header>
        <div className="summary-widget">
          <div className="summary-card summary-card-total">
            <div className="summary-number">{summary.total}</div>
            <div className="summary-label">Всички Резервации</div>
          </div>
          <div className="summary-card success">
            <div className="summary-number">✓ {summary.confirmed}</div>
            <div className="summary-label">Потвърдени</div>
          </div>
          <div className="summary-card warning">
            <div className="summary-number">⏳ {summary.pending}</div>
            <div className="summary-label">Чакащи</div>
          </div>
          <div className="summary-card danger">
            <div className="summary-number">⊘ {summary.noshow}</div>
            <div className="summary-label">Не дошли</div>
          </div>
        </div>
        <div className="button-group">
          <button
            className="btn btn-primary btn-large"
            onClick={() => {
              resetReservationForm();
              setScreen('add-reservation');
            }}
            title="Ctrl+N"
          >
            ➕ Нова Резервация
          </button>
          <button
            className="btn btn-secondary btn-large"
            onClick={() => setScreen('client-lookup')}
            title="Ctrl+K"
          >
            🔍 Търси Клиент
          </button>
        </div>
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Търси по име, телефон или маса... (напр: Greg, +359123456789, Table 5)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            autoFocus
          />
          {searchTerm && (
            <button
              className="search-clear"
              onClick={() => setSearchTerm('')}
              type="button"
              title="Изчисти търсене"
            >
              ✕
            </button>
          )}
        </div>
        <div className="reservations-list">
          <h2>
            {searchTerm
              ? `📌 Резултати: ${filteredReservations.length}`
              : `📅 Резервации (${filteredReservations.length})`}
          </h2>
          {reservationsLoading ? (
            <p className="empty">⏳ Зареждане на резервациите...</p>
          ) : filteredReservations.length === 0 ? (
            <p className="empty">
              {searchTerm ? '❌ Няма резултати' : '😴 Няма резервации за днес'}
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th title="Дата на резервацията">📅 Дата</th>
                    <th title="Час на резервацията">⏰ Час</th>
                    <th title="Име на клиент">👤 Име</th>
                    <th title="Телефонен номер">📱 Телефон</th>
                    <th title="Брой хора">👥 Брой</th>
                    <th title="Номер на маса">🍽️ Маса</th>
                    <th title="Статус на резервацията">📊 Статус</th>
                    <th title="Действия">⚙️ Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map((res) => (
                    <tr key={res.id} className={`status-${res.status}`}>
                      <td>{res.date}</td>
                      <td className="time">{res.time}</td>
                      <td className="client-name">
                        {selectedClient &&
                          selectedClient.phone === res.client_phone &&
                          selectedClient.total_visits >= 10 && (
                            <span className="vip-badge">👑 VIP</span>
                          )}
                        {res.client_name}
                      </td>
                      <td title={res.client_phone}>{res.client_phone}</td>
                      <td>{res.party_size}</td>
                      <td>{res.table_number}</td>
                      <td>
                        <select
                          value={res.status}
                          onChange={(e) =>
                            handleStatusChange(res.id, e.target.value)
                          }
                          className="status-select"
                          title="Промени статус"
                        >
                          <option value="pending">⏳ Чакащо</option>
                          <option value="confirmed">✓ Потвърдено</option>
                          <option value="no-show">⊘ Не дойде</option>
                          <option value="cancelled">❌ Отменено</option>
                        </select>
                      </td>
                      <td>
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => handleDelete(res.id)}
                          type="button"
                          title="Изтрий резервацията"
                        >
                          🗑️ Изтрий
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <button
          className="fab"
          onClick={() => {
            resetReservationForm();
            setScreen('add-reservation');
          }}
          title="Нова резервация"
          type="button"
        >
          ➕
        </button>
        <nav className="mobile-nav">
          <button
            className="nav-item active"
            onClick={() => setScreen('dashboard')}
            type="button"
            title="Начало"
          >
            📋 Начало
          </button>
          <button
            className="nav-item"
            onClick={() => {
              resetReservationForm();
              setScreen('add-reservation');
            }}
            type="button"
            title="Нова резервация"
          >
            ➕ Ново
          </button>
          <button
            className="nav-item"
            onClick={() => setScreen('client-lookup')}
            type="button"
            title="Търси клиент"
          >
            🔍 Търси
          </button>
          <button
            className="nav-item"
            onClick={handleSignOut}
            type="button"
            title="Профил"
          >
            👤 Профил
          </button>
        </nav>
      </div>
    );
  }


  if (screen === 'add-reservation') {
    return (
      <div className="container add-reservation">
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        <header className="header">
          <h1>➕ Нова Резервация</h1>
          <button
            className="btn btn-secondary"
            onClick={() => setScreen('dashboard')}
            type="button"
            title="Назад на начало"
          >
            ← Назад
          </button>
        </header>
        <form onSubmit={handleAddReservation} className="form">
          <div className="form-group">
            <label>👤 Име на клиент</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Например: Георги Иванов"
              autoFocus
            />
            <small className="helper-text">Пълното име на гостът</small>
          </div>
          <PhoneInput
            value={clientPhone}
            onChange={setClientPhone}
            placeholder="+359 89 917 5548"
          />
          <small className="helper-text">Въведете номер и натиснете "Търси клиент"</small>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handlePhoneLookup}
            style={{ marginBottom: '20px', width: '100%' }}
            disabled={loading}
            title="Проверява дали клиентът има предишни резервации"
          >
            {loading ? '⏳ Търсене...' : '🔍 Търси клиент'}
          </button>
          {selectedClient && (
            <div className="client-info success-info">
              ✓ {selectedClient.name} от {selectedClient.city}
              {selectedClient.total_visits >= 10
                ? ' 👑 VIP'
                : ` | ${selectedClient.total_visits} посещения`}
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label>📅 Дата</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={getMinDate()}
              />
              <small className="helper-text">Не може да е в минатото</small>
            </div>
            <div className="form-group">
              <label>⏰ Час</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>👥 Брой хора</label>
              <input
                type="number"
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                min="1"
                max="20"
              />
              <small className="helper-text">1-20 хора</small>
            </div>
            <div className="form-group">
              <label>🍽️ Маса номер</label>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Например: Маса 1, A3, Corner"
              />
              <small className="helper-text">Как называте масата (напр: Маса 1, A3)</small>
            </div>
          </div>
          <div className="form-group">
            <label>📝 Специални бележки (алергия, рожден ден, и т.н.)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Например: Рожден ден, Хлебна алергия, VIP гост, Помолете за тиха маса..."
              rows="3"
              maxLength="200"
            />
            <div className="char-count">{description.length}/200 символа</div>
            <small className="helper-text">Това ще видят служителите</small>
          </div>
          <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
            {loading ? '⏳ Запазване...' : '💾 Запази Резервация'}
          </button>
        </form>
        <nav className="mobile-nav">
          <button
            className="nav-item"
            onClick={() => setScreen('dashboard')}
            type="button"
          >
            📋 Начало
          </button>
          <button
            className="nav-item active"
            onClick={() => setScreen('add-reservation')}
            type="button"
          >
            ➕ Ново
          </button>
          <button
            className="nav-item"
            onClick={() => setScreen('client-lookup')}
            type="button"
          >
            🔍 Търси
          </button>
          <button
            className="nav-item"
            onClick={handleSignOut}
            type="button"
          >
            👤 Профил
          </button>
        </nav>
      </div>
    );
  }


  if (screen === 'client-lookup') {
    return (
      <div className="container client-lookup">
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        <header className="header">
          <h1>🔍 Търси Клиент</h1>
          <button
            className="btn btn-secondary"
            onClick={() => setScreen('dashboard')}
            type="button"
          >
            ← Назад
          </button>
        </header>
        <div className="form">
          <PhoneInput
            value={clientPhone}
            onChange={setClientPhone}
            placeholder="+359 89 917 5548"
          />
          <small className="helper-text">Въведете телефонния номер на клиента</small>
          <button
            className="btn btn-secondary"
            onClick={handlePhoneLookup}
            style={{ marginBottom: '20px', width: '100%' }}
            disabled={loading}
            type="button"
          >
            {loading ? '⏳ Търсене...' : '🔍 Търси'}
          </button>
          {selectedClient && (
            <div className="client-card">
              <div className="client-header">
                <h2>{selectedClient.name}</h2>
                {selectedClient.total_visits >= 10 && (
                  <span className="vip-badge-large">👑 VIP Гост</span>
                )}
              </div>
              <div className="client-details">
                <p>
                  <strong>🌍 Град:</strong> {selectedClient.city}
                </p>
                <p>
                  <strong>📱 Телефон:</strong> {selectedClient.phone}
                </p>
                <p>
                  <strong>📊 Съобщения посещения:</strong> {selectedClient.total_visits}
                </p>
                <p>
                  <strong>📅 Последно посещение:</strong>{' '}
                  {selectedClient.last_visit_date
                    ? new Date(selectedClient.last_visit_date).toLocaleDateString(
                        'bg-BG'
                      )
                    : 'Няма'}
                </p>
                {selectedClient.special_notes && (
                  <p>
                    <strong>📝 Бележки:</strong> {selectedClient.special_notes}
                  </p>
                )}
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setClientName(selectedClient.name);
                  setClientPhone(selectedClient.phone);
                  setScreen('add-reservation');
                }}
                type="button"
              >
                ➕ Нова Резервация за {selectedClient.name}
              </button>
            </div>
          )}
        </div>
        <nav className="mobile-nav">
          <button
            className="nav-item"
            onClick={() => setScreen('dashboard')}
            type="button"
          >
            📋 Начало
          </button>
          <button
            className="nav-item"
            onClick={() => setScreen('add-reservation')}
            type="button"
          >
            ➕ Ново
          </button>
          <button
            className="nav-item active"
            onClick={() => setScreen('client-lookup')}
            type="button"
          >
            🔍 Търси
          </button>
          <button
            className="nav-item"
            onClick={handleSignOut}
            type="button"
          >
            👤 Профил
          </button>
        </nav>
      </div>
    );
  }


  return null;
}
