import { Navigate } from 'react-router-dom';

// LoginPage tự kiểm tra session hiện có (GET /api/auth/me) và điều hướng sang
// /dashboard nếu còn hợp lệ, nên '/' chỉ cần luôn trỏ về /login.
export default function SplashPage() {
  return <Navigate to="/login" replace />;
}
