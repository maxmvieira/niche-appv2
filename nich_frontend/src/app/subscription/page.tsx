"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExclamationTriangleIcon, CheckCircledIcon } from '@radix-ui/react-icons';

export default function SubscriptionPage() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Verificar se o usuário está logado
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    
    try {
      setUser(JSON.parse(userData));
    } catch (err) {
      console.error("Erro ao processar dados do usuário:", err);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [router]);

  const handleSubscribe = async () => {
    setError('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Usuário não autenticado');
      }
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      
      const response = await fetch(`${backendUrl}/api/payment/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Falha ao iniciar processo de assinatura');
      }

      // Redirecionar para a página de checkout do Stripe
      window.location.href = data.url || data.checkout_url;
    } catch (err: any) {
      console.error("Erro de assinatura:", err);
      setError(err.message || 'Ocorreu um erro ao processar a assinatura. Tente novamente mais tarde.');
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setError('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Usuário não autenticado');
      }
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      
      const response = await fetch(`${backendUrl}/api/payment/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Falha ao cancelar assinatura');
      }

      // Atualizar dados do usuário
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
      }
      
      // Mostrar mensagem de sucesso
      alert('Assinatura cancelada com sucesso. Você terá acesso até o final do período atual.');
      
    } catch (err: any) {
      console.error("Erro ao cancelar assinatura:", err);
      setError(err.message || 'Ocorreu um erro ao cancelar a assinatura. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-4">
      <h1 className="text-3xl font-bold text-yellow-500 mb-8">Planos de Assinatura</h1>
      
      {error && (
        <Alert className="mb-6 max-w-3xl w-full bg-red-900/50 border-red-500 text-white">
          <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Plano Gratuito */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold text-white">Plano Gratuito</CardTitle>
            <CardDescription className="text-gray-400">
              Acesso básico às funcionalidades
            </CardDescription>
            <div className="text-3xl font-bold text-white">
              R$ 0<span className="text-lg font-normal text-gray-400">/mês</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              <li className="flex items-center text-gray-300">
                <CheckCircledIcon className="h-5 w-5 text-green-500 mr-2" />
                Acesso ao dashboard
              </li>
              <li className="flex items-center text-gray-300">
                <CheckCircledIcon className="h-5 w-5 text-green-500 mr-2" />
                Visualização de canais salvos
              </li>
              <li className="flex items-center text-gray-400 line-through">
                <ExclamationTriangleIcon className="h-5 w-5 text-gray-500 mr-2" />
                Busca de nichos virais
              </li>
              <li className="flex items-center text-gray-400 line-through">
                <ExclamationTriangleIcon className="h-5 w-5 text-gray-500 mr-2" />
                Filtros avançados
              </li>
              <li className="flex items-center text-gray-400 line-through">
                <ExclamationTriangleIcon className="h-5 w-5 text-gray-500 mr-2" />
                Exportação de dados
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full bg-gray-700 hover:bg-gray-600 text-white"
              onClick={() => router.push('/')}
            >
              {user.is_subscribed ? 'Voltar ao Dashboard' : 'Plano Atual'}
            </Button>
          </CardFooter>
        </Card>
        
        {/* Plano Premium */}
        <Card className="bg-gray-800 border-yellow-500 shadow-lg shadow-yellow-500/20">
          <CardHeader className="space-y-1">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-bold text-yellow-500">Plano Premium</CardTitle>
              <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">RECOMENDADO</span>
            </div>
            <CardDescription className="text-gray-400">
              Acesso completo a todas as funcionalidades
            </CardDescription>
            <div className="text-3xl font-bold text-white">
              R$ 29,90<span className="text-lg font-normal text-gray-400">/mês</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              <li className="flex items-center text-gray-300">
                <CheckCircledIcon className="h-5 w-5 text-green-500 mr-2" />
                Acesso ao dashboard
              </li>
              <li className="flex items-center text-gray-300">
                <CheckCircledIcon className="h-5 w-5 text-green-500 mr-2" />
                Visualização de canais salvos
              </li>
              <li className="flex items-center text-gray-300">
                <CheckCircledIcon className="h-5 w-5 text-green-500 mr-2" />
                <strong>Busca de nichos virais</strong>
              </li>
              <li className="flex items-center text-gray-300">
                <CheckCircledIcon className="h-5 w-5 text-green-500 mr-2" />
                <strong>Filtros avançados</strong>
              </li>
              <li className="flex items-center text-gray-300">
                <CheckCircledIcon className="h-5 w-5 text-green-500 mr-2" />
                <strong>Exportação de dados</strong>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            {user.is_subscribed ? (
              <Button 
                className="w-full bg-red-500 hover:bg-red-600 text-white"
                onClick={handleCancelSubscription}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    <span>Processando...</span>
                  </div>
                ) : (
                  'Cancelar Assinatura'
                )}
              </Button>
            ) : (
              <Button 
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                onClick={handleSubscribe}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                    <span>Processando...</span>
                  </div>
                ) : (
                  'Assinar Agora'
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
      
      <div className="mt-8 text-center text-sm text-gray-400">
        <Link href="/" className="text-yellow-500 hover:underline">
          Voltar para o Dashboard
        </Link>
      </div>
    </div>
  );
}
