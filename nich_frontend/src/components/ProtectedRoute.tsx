import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

// Componente de proteção de rotas que verifica autenticação e assinatura
export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Verificar se o usuário está logado
    const token = localStorage.getItem('token');
    if (!token) {
      // Redirecionar para a página de login
      router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    // Verificar se o usuário tem assinatura ativa
    const checkSubscription = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
        const response = await axios.get(`${backendUrl}/api/auth/check-subscription`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.data.is_subscribed) {
          // Redirecionar para a página de assinatura
          router.push('/subscription');
          return;
        }

        // Usuário está autenticado e tem assinatura ativa
        setLoading(false);
      } catch (err) {
        console.error('Error checking subscription:', err);
        
        // Se o erro for de autenticação (401), redirecionar para login
        if (err.response && err.response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
          return;
        }
        
        setError('Erro ao verificar assinatura. Tente novamente mais tarde.');
        setLoading(false);
      }
    };

    checkSubscription();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="bg-gray-800 p-6 rounded-lg border border-red-500 max-w-md">
          <h2 className="text-xl font-bold text-red-500 mb-4">Erro</h2>
          <p className="text-white mb-4">{error}</p>
          <button 
            onClick={() => router.push('/login')}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium px-4 py-2 rounded"
          >
            Voltar para o Login
          </button>
        </div>
      </div>
    );
  }

  return children;
}
