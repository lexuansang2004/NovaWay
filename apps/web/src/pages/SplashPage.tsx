import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasAuthSession } from '@/services/authService';

export default function SplashPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(hasAuthSession() ? '/dashboard' : '/login', { replace: true });
  }, [navigate]);

  return null;
}
