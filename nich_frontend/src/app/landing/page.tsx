"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Verificar se o usuário está logado
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      
      // Verificar se o usuário tem assinatura ativa
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setIsSubscribed(user.is_subscribed || false);
      setUserName(user.name || '');
    }
  }, []);

  const handleSubscribeClick = () => {
    // Se o usuário estiver logado, verificar assinatura
    if (isLoggedIn) {
      if (isSubscribed) {
        // Se já tem assinatura, ir para o dashboard
        window.location.href = '/';
      } else {
        // Se não tem assinatura, ir para a página de assinatura
        window.location.href = '/subscription';
      }
    } else {
      // Se não estiver logado, ir para a página de registro
      window.location.href = '/register';
    }
  };

  const handleLoginClick = () => {
    if (isLoggedIn) {
      // Se já está logado, ir para o dashboard
      window.location.href = '/';
    } else {
      // Se não está logado, ir para a página de login
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="py-4 px-6 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-yellow-500">Niche</h1>
        </div>
        <div>
          <Button 
            onClick={handleLoginClick}
            variant="outline" 
            className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black mr-2"
          >
            {isLoggedIn ? 'Dashboard' : 'Login'}
          </Button>
          <Button 
            onClick={handleSubscribeClick}
            className="bg-yellow-500 hover:bg-yellow-600 text-black"
          >
            {isLoggedIn && isSubscribed ? 'Acessar Dashboard' : 'Subscribe Now'}
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">
            Descubra <span className="text-yellow-500">Nichos Virais</span> para seu Conteúdo
          </h1>
          <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
            Encontre os nichos mais virais do YouTube e crie conteúdo que realmente engaja seu público. 
            Nossa plataforma analisa milhões de vídeos para identificar tendências e oportunidades.
          </p>
          <Button 
            onClick={handleSubscribeClick}
            className="bg-yellow-500 hover:bg-yellow-600 text-black text-lg px-8 py-6"
            size="lg"
          >
            Comece Agora
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-gray-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Por que escolher a <span className="text-yellow-500">Niche</span>?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="pt-6">
                <div className="text-yellow-500 text-4xl mb-4">🔍</div>
                <h3 className="text-xl font-bold mb-2">Busca Avançada</h3>
                <p className="text-gray-300">
                  Filtre por visualizações, engajamento, número de inscritos e muito mais para encontrar os nichos perfeitos.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="pt-6">
                <div className="text-yellow-500 text-4xl mb-4">🔥</div>
                <h3 className="text-xl font-bold mb-2">Potencial de Viralização</h3>
                <p className="text-gray-300">
                  Análise exclusiva que mostra o potencial de viralização de cada nicho, baseado em dados reais.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="pt-6">
                <div className="text-yellow-500 text-4xl mb-4">📊</div>
                <h3 className="text-xl font-bold mb-2">Dados Atualizados</h3>
                <p className="text-gray-300">
                  Acesso a dados sempre atualizados do YouTube, garantindo que você esteja sempre à frente das tendências.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Plano <span className="text-yellow-500">Premium</span>
          </h2>
          
          <Card className="bg-gray-800 border-yellow-500">
            <CardContent className="pt-6 pb-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-yellow-500 mb-2">Niche Premium</h3>
                <div className="text-4xl font-bold mb-2">R$29,90<span className="text-xl text-gray-400">/mês</span></div>
                <p className="text-gray-300">Acesso completo a todas as funcionalidades</p>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <span>Busca ilimitada de nichos virais</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <span>Filtros avançados de busca</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <span>Análise de potencial de viralização</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <span>Dados sempre atualizados</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <span>Suporte prioritário</span>
                </div>
              </div>
              
              <div className="text-center">
                <Button 
                  onClick={handleSubscribeClick}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black px-8 py-2 text-lg"
                  size="lg"
                >
                  Assinar Agora
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-gray-800 border-t border-gray-700">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-yellow-500 mb-4">Niche</h2>
          <p className="text-gray-400 mb-6">
            A melhor plataforma para encontrar nichos virais e impulsionar seu conteúdo
          </p>
          <div className="flex justify-center space-x-4">
            <Button 
              onClick={handleLoginClick}
              variant="outline" 
              className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black"
            >
              {isLoggedIn ? 'Dashboard' : 'Login'}
            </Button>
            <Button 
              onClick={handleSubscribeClick}
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              {isLoggedIn && isSubscribed ? 'Acessar Dashboard' : 'Subscribe Now'}
            </Button>
          </div>
          <p className="text-gray-500 mt-8">
            &copy; {new Date().getFullYear()} Niche. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
