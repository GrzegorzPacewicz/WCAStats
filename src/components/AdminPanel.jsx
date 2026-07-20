import { useState, useEffect } from 'react';
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://gp1.pecet.it');
const WORKER_URL = 'https://wcastats-prefetch.g-pacewicz.workers.dev';

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    if (pb.authStore.isValid) {
      setIsLoggedIn(true);
      fetchLogs();
    }
  }, []);

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const records = await pb.collection('prefetch_logs').getList(1, 10, {
        sort: '-created',
      });
      setLogs(records.items);
    } catch (err) {
      console.error('Failed to fetch logs:', err.message);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);

    try {
      await pb.collection('users').authWithPassword(email, password);
      setIsLoggedIn(true);
      fetchLogs();
    } catch (err) {
      setLoginError('Nieprawidłowy email lub hasło');
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
    setIsLoggedIn(false);
    setLogs([]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshResult(null);

    try {
      const token = pb.authStore.token;
      const res = await fetch(`${WORKER_URL}/run`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setRefreshResult({ success: true, message: 'Prefetch uruchomiony' });
        setTimeout(fetchLogs, 5000);
      } else {
        const text = await res.text();
        setRefreshResult({ success: false, message: `Błąd: ${res.status} ${text}` });
      }
    } catch (err) {
      setRefreshResult({ success: false, message: `Błąd: ${err.message}` });
    } finally {
      setRefreshing(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Panel administracyjny</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hasło</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            {loginError && (
              <div className="text-red-600 text-sm">{loginError}</div>
            )}
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Zaloguj się
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Panel administracyjny</h2>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Wyloguj
          </button>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors"
          >
            {refreshing ? 'Odświeżanie...' : 'Odśwież cache'}
          </button>

          {refreshResult && (
            <div className={`p-3 rounded-lg ${refreshResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {refreshResult.message}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Ostatnie logi</h3>
          <button
            onClick={fetchLogs}
            disabled={logsLoading}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {logsLoading ? 'Ładowanie...' : 'Odśwież'}
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="text-gray-500 text-sm">Brak logów</div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="border-b border-gray-100 pb-3 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${log.status === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {log.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(log.created).toLocaleString('pl-PL')}
                  </span>
                </div>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">{log.message}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
