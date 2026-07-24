import { Route, Routes } from 'react-router-dom';
import SplashPage from '@/pages/SplashPage';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import VehiclesPage from '@/pages/VehiclesPage';
import LiveMapPage from '@/pages/LiveMapPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import { ComingSoonPage } from '@/pages/ComingSoonPage';
import { AppLayout } from '@/layouts/AppLayout';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<SplashPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes, bọc trong AppLayout (Sidebar + Main Area) */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/start-trip" element={<LiveMapPage />} />
        <Route path="/vehicles" element={<VehiclesPage />} />
        <Route path="/trip-history" element={<AnalyticsPage />} />
        <Route path="/offline-sync" element={<ComingSoonPage title="Offline Sync" />} />
        <Route path="/settings" element={<ComingSoonPage title="Cài đặt" />} />
        <Route path="/account/profile" element={<ComingSoonPage title="Hồ sơ cá nhân" />} />
        <Route path="/account/privacy" element={<ComingSoonPage title="Quyền riêng tư" />} />
        <Route path="/help" element={<ComingSoonPage title="Trợ giúp" />} />
      </Route>
    </Routes>
  );
}

export default App;
