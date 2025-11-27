import React, { useState, useEffect } from 'react';
import './App.css';
import {
  addReservation,
  getReservationsForToday,
  getClientByPhone,
  addClient,
  updateClientVisits,
  updateReservationStatus,
  deleteReservation,
  subscribeToReservations,
  signUpManager,
  signInManager,
  signOutManager,
  onAuthChange,
  getCurrentUser
} from './firebase';

export default function App() {
  const [screen, setScreen] = useState('loading'); // loading, auth, dashboard, add-reservation, client-lookup
  const [authTab, setAuthTab] = useState('signin'); // signin or signup
  const [user, setUser] = useState(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [reservations, setReservations] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states for adding reservation
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('19:30');
  const [partySize, setPartySize] = useState(4);
  const [tableNumber, setTableNumber] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);

  // Check if user is already logged in on app load
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

  // Handle Sign Up
  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Паролите не съвпадат');
      return;
    }

    if (password.length < 6) {
      setError('Паролата трябва да е поне 6 символа');
      return;
    }

    if (!restaurantName.trim()) {
      setError('Въведете име на ресторант');
      return;
    }

    try {
      await signUpManager(email, password);
      setSuccess('✓ Регистрацията е успешна!');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      // Auto-login after signup
      setAuthTab('signin');
      setTimeout(() => {
        setSuccess('');
      }, 2000);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Този имейл вече е регистриран');
      } else if (err.code === 'auth/invalid-email') {
        setError('Невалиден имейл адрес');
      } else {
        setError('Грешка при регистрация: ' + err.message);
      }
    }
  };

  // Handle Sign In
  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!restaurantName.trim()) {
      setError('Въведете име на ресторант');
      return;
    }

    try {
      await signInManager(email, password);
      setSuccess('✓ Успешен вход!');
      setEmail('');
      setPassword('');
      // Dashboard loads automatically via onAuthChange
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError('Потребител не намерен');
      } else if (err.code === 'auth/wrong-password') {
        setError('Неправилна парола');
      } else if (err.code === 'auth/invalid-email') {
        setError('Невалиден имейл адрес');
      } else {
        setError('Грешка при вход: ' + err.message);
      }
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await signOutManager();
      setUser(null);
      setScreen('auth');
      setRestaurantName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError('Грешка при изход: ' + err.message);
    }
  };

  // Load today's reservations
  useEffect(() => {
    if (screen === 'dashboard' && restaurantName) {
      const unsubscribe = subscribeToReservations(restaurantName, setReservations);
      return () => unsubscribe();
    }
  }, [screen, restaurantName]);

  // Look up client by phone
  const handlePhoneLookup = async () => {
    if (!clientPhone) {
      setError('Въведете телефонен номер');
      return;
    }
    try {
      const client = await getClientByPhone(clientPhone);
      if (client) {
        setSelectedClient(client);
        setClientName(client.name);
        setSuccess(`✓ ${client.name} от ${client.city} | ${client.total_visits} посещения`);
      } else {
        setSelectedClient(null);
        setSuccess('Нов клиент');
      }
      setError('');
    } catch (err) {
      setError('Грешка: ' + err.message);
    }
  };

  // Add reservation
  const handleAddReservation = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!clientName || !clientPhone || !date || !time || !tableNumber) {
      setError('Попълнете всички полета');
      return;
    }

    try {
      // Add reservation
      await addReservation({
        restaurant_name: restaurantName,
        client_name: clientName,
        client_phone: clientPhone,
        date: new Date(date),
        time: time,
        party_size: parseInt(partySize),
        table_number: tableNumber,
        description: description
      });

      // Add or update client
      if (selectedClient) {
        await updateClientVisits(selectedClient.id, selectedClient.total_visits + 1);
      } else {
        await addClient({
          name: clientName,
          phone: clientPhone,
          city: 'Неизвестен',
          favorite_table: tableNumber,
          special_notes: ''
        });
      }

      setSuccess(`✓ Резервация за ${clientName} в ${time}`);
      // Reset form
      setClientName('');
      setClientPhone('');
      setTableNumber('');
      setDescription('');
      setSelectedClient(null);
      setTime('19:30');
      setDate(new Date().toISOString().split('T')[0]);
      setScreen('dashboard');
    } catch (err) {
      setError('Грешка: ' + err.message);
    }
  };

  // Update status
  const handleStatusChange = async (reservationId, newStatus) => {
    try {
      await updateReservationStatus(reservationId, newStatus);
      setSuccess('Статусът е обновен');
    } catch (err) {
      setError('Грешка: ' + err.message);
    }
  };

  // Delete reservation
  const handleDelete = async (reservationId) => {
    if (window.confirm('Сигурни ли сте?')) {
      try {
        await deleteReservation(reservationId);
        setSuccess('Резервацията е изтрита');
      } catch (err) {
        setError('Грешка: ' + err.message);
      }
    }
  };

  // ===== SCREENS =====

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
        <div className="auth-box">
          <h1>🍽️ ReservePro</h1>
          
          <div className="auth-tabs">
            <button
              className={`tab ${authTab === 'signin' ? 'active' : ''}`}
              onClick={() => {
                setAuthTab('signin');
                setError('');
                setSuccess('');
              }}
            >
              Вход
            </button>
            <button
              className={`tab ${authTab === 'signup' ? 'active' : ''}`}
              onClick={() => {
                setAuthTab('signup');
                setError('');
                setSuccess('');
              }}
            >
              Регистрация
            </button>
          </div>

          {authTab === 'signin' ? (
            <form onSubmit={handleSignIn}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Парола</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Парола"
                  required
                />
              </div>
              <div className="form-group">
                <label>Име на ресторант</label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="Име на вашия ресторант"
                  required
                />
              </div>
              {error && <div className="error">{error}</div>}
              {success && <div className="success">{success}</div>}
              <button type="submit" className="btn btn-primary">Вход</button>
            </form>
          ) : (
            <form onSubmit={handleSignUp}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Парола (минимум 6 символа)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Парола"
                  required
                />
              </div>
              <div className="form-group">
                <label>Потвърдете парола</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Повторете парола"
                  required
                />
              </div>
              <div className="form-group">
                <label>Име на ресторант</label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="Име на вашия ресторант"
                  required
                />
              </div>
              {error && <div className="error">{error}</div>}
              {success && <div className="success">{success}</div>}
              <button type="submit" className="btn btn-primary">Регистрирай се</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (screen === 'dashboard') {
    return (
      <div className="container dashboard">
        <header className="header">
          <div>
            <h1>📋 Резервации - {restaurantName}</h1>
            <p>{new Date().toLocaleDateString('bg-BG')}</p>
          </div>
          <button className="btn btn-secondary" onClick={handleSignOut}>Изход</button>
        </header>

        <div className="button-group">
          <button className="btn btn-primary" onClick={() => setScreen('add-reservation')}>
            ➕ Нова Резервация
          </button>
          <button className="btn btn-secondary" onClick={() => setScreen('client-lookup')}>
            🔍 Търси Клиент
          </button>
        </div>

        {success && <div className="success">{success}</div>}
        {error && <div className="error">{error}</div>}

        <div className="reservations-list">
          <h2>Резервации за днес ({reservations.length})</h2>
          {reservations.length === 0 ? (
            <p className="empty">Няма резервации</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Час</th>
                  <th>Име</th>
                  <th>Телефон</th>
                  <th>Брой</th>
                  <th>Маса</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((res) => (
                  <tr key={res.id} className={`status-${res.status}`}>
                    <td className="time">{res.time}</td>
                    <td>{res.client_name}</td>
                    <td>{res.client_phone}</td>
                    <td>{res.party_size}</td>
                    <td>{res.table_number}</td>
                    <td>
                      <select
                        value={res.status}
                        onChange={(e) => handleStatusChange(res.id, e.target.value)}
                        className="status-select"
                      >
                        <option value="pending">Чакащо</option>
                        <option value="confirmed">Потвърдено</option>
                        <option value="no-show">Не дойде</option>
                        <option value="cancelled">Отменено</option>
                      </select>
                    </td>
                    <td>
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => handleDelete(res.id)}
                      >
                        Изтрий
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  if (screen === 'add-reservation') {
    return (
      <div className="container add-reservation">
        <header className="header">
          <h1>➕ Нова Резервация</h1>
          <button className="btn btn-secondary" onClick={() => setScreen('dashboard')}>Назад</button>
        </header>

        <form onSubmit={handleAddReservation} className="form">
          <div className="form-group">
            <label>Име на клиент</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Име"
            />
          </div>

          <div className="form-group">
            <label>Телефонен номер</label>
            <div className="input-with-button">
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+359 123 456 789"
              />
              <button type="button" className="btn btn-secondary" onClick={handlePhoneLookup}>
                Търси
              </button>
            </div>
          </div>

          {selectedClient && (
            <div className="client-info">
              ✓ {selectedClient.name} от {selectedClient.city} | {selectedClient.total_visits} посещения
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Дата</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Час</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Брой хора</label>
              <input
                type="number"
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                min="1"
                max="20"
              />
            </div>
            <div className="form-group">
              <label>Маса номер</label>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Маса 1, Маса 2..."
              />
            </div>
          </div>

          <div className="form-group">
            <label>Описание (напр. рожден ден, алергия)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Допълнителна информация"
              rows="3"
            />
          </div>

          {success && <div className="success">{success}</div>}
          {error && <div className="error">{error}</div>}

          <button type="submit" className="btn btn-primary">💾 Запази Резервация</button>
        </form>
      </div>
    );
  }

  if (screen === 'client-lookup') {
    return (
      <div className="container client-lookup">
        <header className="header">
          <h1>🔍 Търси Клиент</h1>
          <button className="btn btn-secondary" onClick={() => setScreen('dashboard')}>Назад</button>
        </header>

        <div className="form-group">
          <label>Телефонен номер</label>
          <div className="input-with-button">
            <input
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="+359 123 456 789"
            />
            <button className="btn btn-secondary" onClick={handlePhoneLookup}>
              Търси
            </button>
          </div>
        </div>

        {selectedClient && (
          <div className="client-card">
            <h2>{selectedClient.name}</h2>
            <p><strong>Град:</strong> {selectedClient.city}</p>
            <p><strong>Телефон:</strong> {selectedClient.phone}</p>
            <p><strong>Посещения:</strong> {selectedClient.total_visits}</p>
            <p><strong>Последно посещение:</strong> {selectedClient.last_visit_date ? new Date(selectedClient.last_visit_date).toLocaleDateString('bg-BG') : 'Няма'}</p>
            {selectedClient.special_notes && <p><strong>Бележки:</strong> {selectedClient.special_notes}</p>}
            <button className="btn btn-primary" onClick={() => {
              setClientName(selectedClient.name);
              setClientPhone(selectedClient.phone);
              setScreen('add-reservation');
            }}>
              ➕ Нова Резервация за {selectedClient.name}
            </button>
          </div>
        )}

        {success && <div className="success">{success}</div>}
        {error && <div className="error">{error}</div>}
      </div>
    );
  }
}
