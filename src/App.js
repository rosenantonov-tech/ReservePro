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

  // Резервации
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);

  // Търсене
  const [searchTerm, setSearchTerm] = useState('');

  // Глобален toast
  const [toast, setToast] = useState(null);

  // Loading за действия (login, save, lookup и т.н.)
  const [loading, setLoading] = useState(false);

  // Form states
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('19:30');
  const [partySize, setPartySize] = useState(4);
  const [tableNumber, setTableNumber] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);

  // ===== UTILS =====

  const getTodayIso = () => new Date().toISOString().split('T')[0];

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
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

  // ===== EFFECTS =====

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'n') {
          e.preventDefault();
          setScreen('add-reservation');
        } else if (e.key === 'k') {
          e.preventDefault();
          setScreen('client-lookup');
        } else if (e.key === 's' && screen !== 'auth') {
          e.preventDefault();
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

  // Subscribe към резервации (подобрено)
  useEffect(() => {
    if (screen === 'dashboard' && restaurantName) {
      setReservationsLoading(true);

      const unsubscribe = subscribeToReservations(restaurantName, (res) => {
        // Нормализираме датата да е винаги 'YYYY-MM-DD' и сортираме по час
        const normalized = res
          .map((r) => {
            let normalizedDate;

            if (!r.date) {
              normalizedDate = getTodayIso();
            } else if (typeof r.date === 'string') {
              normalizedDate = r.date.split('T')[0];
            } else {
              // Firestore Timestamp или JS Date
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

  // Real-time филтър (име/телефон/маса)
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

  // ===== AUTH HANDLERS =====

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      showToast('Паролите не съвпадат', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Паролата трябва да е поне 6 символа', 'error');
      return;
    }
    if (!restaurantName.trim()) {
      showToast('Въведете име на ресторант', 'error');
      return;
    }

    try {
      setLoading(true);
      await signUpManager(email, password);
      showToast('✓ Регистрацията е успешна!', 'success');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setAuthTab('signin');
    } catch (err) {
      showToast('Грешка: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();

    if (!restaurantName.trim()) {
      showToast('Въведете име на ресторант', 'error');
      return;
    }

    try {
      setLoading(true);
      await signInManager(email, password);
      showToast('✓ Успешен вход!', 'success');
      setEmail('');
      setPassword('');
    } catch (err) {
      showToast('Грешка: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutManager();
      setUser(null);
      setScreen('auth');
      setRestaurantName('');
      resetReservationForm();
      setReservations([]);
      setFilteredReservations([]);
      setSearchTerm('');
      showToast('Успешен изход', 'info');
    } catch (err) {
      showToast('Грешка при изход', 'error');
    }
  };

  // ===== CLIENT / PHONE =====

  const handlePhoneLookup = async () => {
    if (!clientPhone) {
      showToast('Въведете телефонен номер', 'error');
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
        showToast('Нов клиент', 'info');
      }
    } catch (err) {
      showToast('Грешка: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ===== RESERVATIONS =====

  const handleAddReservation = async (e) => {
    e.preventDefault();

    if (!clientName || !clientPhone || !date || !time || !tableNumber) {
      showToast('Попълнете всички полета', 'error');
      return;
    }

    // Лека валидация на телефон
    const phoneClean = clientPhone.replace(/\s+/g, '');
    if (phoneClean.length < 6) {
      showToast('Телефонният номер изглежда твърде кратък', 'error');
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
      showToast('Грешка: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (reservationId, newStatus) => {
    try {
      await updateReservationStatus(reservationId, newStatus);
      showToast('✓ Статусът е обновен', 'success');
    } catch (err) {
      showToast('Грешка: ' + err.message, 'error');
    }
  };

  const handleDelete = async (reservationId) => {
    if (window.confirm('Сигурни ли сте?')) {
      try {
        await deleteReservation(reservationId);
        showToast('✓ Резервацията е изтрита', 'success');
      } catch (err) {
        showToast('Грешка: ' + err.message, 'error');
      }
    }
  };

  // ===== UI RENDERS =====

  if (screen === 'loading') {
    return (
      <div className="container loading-screen">
        <div className="loading">
          <h1>🍽️ ReservePro</h1>
          <p>Зареждане...</p>
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

          <div className="auth-tabs">
            <button
              className={`tab ${authTab === 'signin' ? 'active' : ''}`}
              onClick={() => setAuthTab('signin')}
              type="button"
            >
              Вход
            </button>
            <button
              className={`tab ${authTab === 'signup' ? 'active' : ''}`}
              onClick={() => setAuthTab('signup')}
              type="button"
            >
              Регистрация
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
                <label>🏪 Име на ресторант</label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="Име на вашия ресторант"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Зареждане...' : 'Вход'}
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
                <label>🏪 Име на ресторант</label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="Име на вашия ресторант"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Зареждане...' : 'Регистрирай се'}
              </button>
            </form>
          )}

          <p className="hint">
            💡 Hint: Ctrl+N = нова резервация | Ctrl+K = търси клиент
          </p>
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
          <div>
            <h1>📋 {restaurantName}</h1>
            <p>
              {new Date().toLocaleDateString('bg-BG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <button className="btn btn-secondary" onClick={handleSignOut}>
            Изход
          </button>
        </header>

        {/* SUMMARY WIDGET */}
        <div className="summary-widget">
          <div className="summary-card">
            <div className="summary-number">{summary.total}</div>
            <div className="summary-label">Резервации (заредени)</div>
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

        {/* ACTION BUTTONS */}
        <div className="button-group">
          <button
            className="btn btn-primary"
            onClick={() => {
              resetReservationForm();
              setScreen('add-reservation');
            }}
          >
            ➕ Нова Резервация (Ctrl+N)
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setScreen('client-lookup')}
          >
            🔍 Търси Клиент (Ctrl+K)
          </button>
        </div>

        {/* SEARCH BOX */}
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Търси по име, телефон или маса..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button
              className="search-clear"
              onClick={() => setSearchTerm('')}
              type="button"
            >
              ✕
            </button>
          )}
        </div>

        {/* RESERVATIONS LIST */}
        <div className="reservations-list">
          <h2>
            {searchTerm
              ? `Резултати: ${filteredReservations.length}`
              : `Резервации (${filteredReservations.length})`}
          </h2>

          {reservationsLoading ? (
            <p className="empty">⏳ Зареждане на резервациите...</p>
          ) : filteredReservations.length === 0 ? (
            <p className="empty">
              {searchTerm ? '❌ Няма резултати' : '😴 Няма резервации'}
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>📅 Дата</th>
                    <th>⏰ Час</th>
                    <th>👤 Име</th>
                    <th>📱 Телефон</th>
                    <th>👥 Брой</th>
                    <th>🍽️ Маса</th>
                    <th>📊 Статус</th>
                    <th>⚙️ Действия</th>
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
                            <span className="vip-badge">👑</span>
                          )}
                        {res.client_name}
                      </td>
                      <td>{res.client_phone}</td>
                      <td>{res.party_size} пл.</td>
                      <td>{res.table_number}</td>
                      <td>
                        <select
                          value={res.status}
                          onChange={(e) =>
                            handleStatusChange(res.id, e.target.value)
                          }
                          className="status-select"
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
                        >
                          Изтрий
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MOBILE FAB */}
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

        {/* MOBILE BOTTOM NAV */}
        <nav className="mobile-nav">
          <button
            className="nav-item active"
            onClick={() => setScreen('dashboard')}
            type="button"
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
          >
            ←Назад
          </button>
        </header>

        <form onSubmit={handleAddReservation} className="form">
          <div className="form-group">
            <label>👤 Име на клиент</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Име"
            />
          </div>

          <PhoneInput
            value={clientPhone}
            onChange={setClientPhone}
            placeholder="+359 89 917 5548"
          />

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handlePhoneLookup}
            style={{ marginBottom: '20px', width: '100%' }}
            disabled={loading}
          >
            {loading ? '⏳ Търсене...' : '🔍 Търси клиент'}
          </button>

          {selectedClient && (
            <div className="client-info">
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
            </div>
            <div className="form-group">
              <label>🍽️ Маса номер</label>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Маса 1, Маса 2..."
              />
            </div>
          </div>

          <div className="form-group">
            <label>📝 Описание (напр. рожден ден, алергия)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Допълнителна информация"
              rows="3"
              maxLength="200"
            />
            <div className="char-count">{description.length}/200</div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '⏳ Запазване...' : '💾 Запази Резервация (Ctrl+S)'}
          </button>
        </form>

        {/* MOBILE BOTTOM NAV */}
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
            ←Назад
          </button>
        </header>

        <PhoneInput
          value={clientPhone}
          onChange={setClientPhone}
          placeholder="+359 89 917 5548"
        />

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
                <span className="vip-badge-large">👑 VIP</span>
              )}
            </div>
            <p>
              <strong>🌍 Град:</strong> {selectedClient.city}
            </p>
            <p>
              <strong>📱 Телефон:</strong> {selectedClient.phone}
            </p>
            <p>
              <strong>📊 Посещения:</strong> {selectedClient.total_visits}
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

        {/* MOBILE BOTTOM NAV */}
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