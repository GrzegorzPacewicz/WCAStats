import { useState, useEffect } from 'react';
import PocketBase from 'pocketbase';
import { refreshRecentCompetitions, fetchAllData } from '../api/wca';

const pb = new PocketBase('https://gp1.pecet.it');

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [refreshResult, setRefreshResult] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: currentYear - 2003 + 1 }, (_, i) => currentYear - i);

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

  const logToPocketBase = async (status, message) => {
    try {
      await pb.collection('prefetch_logs').create({ status, message });
    } catch (err) {
      console.error('Failed to log:', err.message);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshResult(null);
    setProgress(null);

    try {
      const result = await refreshRecentCompetitions('PL', (p) => {
        setProgress(p);
      });

      const message = `Pobrano: ${result.updated}, z cache: ${result.skipped}`;
      await logToPocketBase('ok', message);
      await fetchLogs();

      setRefreshResult({
        success: true,
        message: `Zakończono!\n${message}`
      });
    } catch (err) {
      const message = `Błąd: ${err.message}`;
      await logToPocketBase('error', message);
      await fetchLogs();

      setRefreshResult({ success: false, message });
    } finally {
      setRefreshing(false);
      setProgress(null);
    }
  };

  const handleRefreshYear = async () => {
    if (!selectedYear) return;

    setRefreshing(true);
    setRefreshResult(null);
    setProgress(null);

    try {
      const data = await fetchAllData('PL', selectedYear, (p) => {
        setProgress(p);
      }, true);

      const message = `Rok ${selectedYear}: ${data.competitions.length} zawodów, ${data.totalCompetitors} zawodników`;
      await logToPocketBase('ok', message);
      await fetchLogs();

      setRefreshResult({
        success: true,
        message: `Zakończono!\n${message}`
      });
    } catch (err) {
      const message = `Błąd ${selectedYear}: ${err.message}`;
      await logToPocketBase('error', message);
      await fetchLogs();

      setRefreshResult({ success: false, message });
    } finally {
      setRefreshing(false);
      setProgress(null);
      setSelectedYear(null);
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
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Odświeża zawody z ostatnich 4 tygodni oraz wszystkie przyszłe zawody.
            </p>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors"
            >
              {refreshing ? 'Odświeżanie...' : 'Odśwież aktualne zawody'}
            </button>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-600 mb-2">
              Pełne odświeżenie wybranego roku (wszystkie zawody):
            </p>
            <div className="flex gap-2 items-center">
              <select
                value={selectedYear || ''}
                onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
                disabled={refreshing}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Wybierz rok...</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <button
                onClick={handleRefreshYear}
                disabled={refreshing || !selectedYear}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
              >
                Pobierz rok
              </button>
            </div>
          </div>

          {progress && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex justify-between text-sm text-blue-800 mb-1">
                <span>{progress.current}/{progress.total}</span>
                {progress.total > 0 && <span>{Math.round((progress.current / progress.total) * 100)}%</span>}
              </div>
              {progress.total > 0 && (
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              )}
              <div className="text-xs text-blue-600 mt-1 truncate">{progress.name}</div>
            </div>
          )}

          {refreshResult && (
            <div className={`p-3 rounded-lg whitespace-pre-wrap ${refreshResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
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
