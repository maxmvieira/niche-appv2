// src/app/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart, MenuIcon, ChevronLeft, ChevronRight, LayoutDashboard, LogOut, Flame, Search, BookmarkIcon, MessageCircle, ExternalLink } from "lucide-react";

import { saveAs } from "file-saver";
import Papa from "papaparse";
import { loadStripe } from "@stripe/stripe-js";

interface NichResult {
  channelName: string;
  channelLink: string;
  subscriberCount: number;
  videoTitle: string;
  videoLink: string;
  viewCount: number;
  publishedAt: string;
  keyword: string;
  viewsPerSubscriber: number;
  platform?: string;
  niche?: string;
  likeCount?: number;
  commentCount?: number;
  thumbnailUrl?: string;
}

// Interface para os metadados de paginação
interface PaginationInfo {
  page: number;
  page_size: number;
  total_pages: number;
  total_results: number;
}

// Interface para a resposta da API
interface ApiResponse {
  results: NichResult[];
  pagination: PaginationInfo;
}

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_51RK6VmGbde7HGq89NHb4oCLxCVsgZReaNSZoDga95udXG6OEBjh318rcDiq5YuBdmV1xyAFjwKgKLp2917dybuOj00ALSJuLD8";
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

const availableNiches = [
  "Motivational", "Politics", "FamilyGuy", "Basketball", "Finance", "History", "Quiz", "Animals",
  "Series", "TV Shows", "Educational", "Geography", "Horror Stories",
  "Fitness", "Ranking Content", "Reddit Stories", "Crypto", "Travel",
  "Storytelling", "Gaming", "Lifestyle", "Food & Drink"
];

const ITEMS_PER_PAGE = 20;

export default function Home() {
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [videoPublishedDays, setVideoPublishedDays] = useState("90");
  const [maxSubs, setMaxSubs] = useState("100000");
  const [minViews, setMinViews] = useState("1000");
  const [maxChannelVideosTotal, setMaxChannelVideosTotal] = useState("999999");

  const [allResults, setAllResults] = useState<NichResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  const [favoritedVideos, setFavoritedVideos] = useState<string[]>([]);
  const [savedChannels, setSavedChannels] = useState<NichResult[]>([]);
  const [showSavedChannels, setShowSavedChannels] = useState(false);

  const [platformFilter, setPlatformFilter] = useState<string>("YouTube Shorts");
  const [sortBy, setSortBy] = useState<string>("views_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showLangOverlay] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Novos estados para paginação da API
  const [apiCurrentPage, setApiCurrentPage] = useState(1);
  const [apiPageSize, setApiPageSize] = useState(100);
  const [apiTotalPages, setApiTotalPages] = useState(1);
  const [apiTotalResults, setApiTotalResults] = useState(0);

  // Load saved channels from localStorage on component mount
  useEffect(() => {
    const loadSavedChannels = () => {
      const savedChannelsStr = localStorage.getItem('savedChannels');
      if (savedChannelsStr) {
        try {
          const savedData = JSON.parse(savedChannelsStr);
          setSavedChannels(savedData);
        } catch (err) {
          console.error("Error loading saved channels:", err);
        }
      }
    };
    
    loadSavedChannels();
  }, []);

  // Save to localStorage whenever savedChannels changes
  useEffect(() => {
    if (savedChannels.length > 0) {
      localStorage.setItem('savedChannels', JSON.stringify(savedChannels));
    }
  }, [savedChannels]);

  useEffect(() => {
    const checkSub = async () => {
      setCheckingSubscription(true);
      try {
        const query = new URLSearchParams(window.location.search);
        if (query.get("subscribed") === "true") {
          setIsSubscribed(true);
        }
      } catch (err) {
        console.error("Failed to verify subscription:", err);
        setIsSubscribed(false);
      } finally {
        setCheckingSubscription(false);
      }
    };
    checkSub();
  }, []);

  const handleNicheChange = (niche: string) => {
    setSelectedNiches(prev =>
      prev.includes(niche) ? prev.filter(n => n !== niche) : [...prev, niche]
    );
    setCurrentPage(1);
  };

  // Função para abrir o link do vídeo em uma nova aba
  const openVideoLink = (videoLink: string) => {
    window.open(videoLink, '_blank');
  };

  const toggleFavorite = (event: React.MouseEvent, result: NichResult) => {
    // Impedir que o clique no botão de favorito também abra o link do vídeo
    event.stopPropagation();
    
    const videoLink = result.videoLink;
    
    // Update favorited videos list
    setFavoritedVideos(prev =>
      prev.includes(videoLink) ? prev.filter(link => link !== videoLink) : [...prev, videoLink]
    );
    
    // Update saved channels list
    setSavedChannels(prev => {
      // If already saved, remove it
      if (prev.some(item => item.videoLink === videoLink)) {
        return prev.filter(item => item.videoLink !== videoLink);
      } 
      // Otherwise add it
      else {
        return [...prev, result];
      }
    });
  };

  const handleSearch = async () => {
    if (!isSubscribed && !checkingSubscription) {
      setError("Only subscribers can use this feature");
      return;
    }
    if (selectedNiches.length === 0) {
      setError("Please select at least one niche");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAllResults([]);
    setCurrentPage(1);
    setShowSavedChannels(false);
    
    // Resetar a página da API para 1 ao iniciar uma nova busca
    setApiCurrentPage(1);

    const searchParams = {
      niches: selectedNiches.join(","),
      video_published_days: videoPublishedDays,
      max_subs: maxSubs,
      min_views: minViews,
      max_channel_videos_total: maxChannelVideosTotal,
      page: "1",  // Começar sempre pela primeira página
      page_size: apiPageSize.toString()
    };

    const params = new URLSearchParams(searchParams);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
      const response = await fetch(`${backendUrl}/api/search/viral-videos?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP Error: ${response.status}`);
      }

      // Nova estrutura de resposta com paginação
      const responseData: ApiResponse = await response.json();
      
      // Extrair os resultados e metadados de paginação
      const results = responseData.results || [];
      const paginationInfo = responseData.pagination || {
        page: 1,
        page_size: apiPageSize,
        total_pages: 1,
        total_results: results.length
      };
      
      // Atualizar estados com os dados recebidos
      setAllResults(results);
      setApiCurrentPage(paginationInfo.page);
      setApiPageSize(paginationInfo.page_size);
      setApiTotalPages(paginationInfo.total_pages);
      setApiTotalResults(paginationInfo.total_results);
      
      console.log(`Mostrando ${results.length} de ${paginationInfo.total_results} resultados totais (Página ${paginationInfo.page} de ${paginationInfo.total_pages})`);

    } catch (err: any) {
      console.error("Search failed:", err);
      setError(err.message || "Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Função para carregar uma página específica da API
  const loadApiPage = async (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > apiTotalPages || pageNumber === apiCurrentPage) return;
    
    setIsLoading(true);
    setError(null);
    
    const searchParams = {
      niches: selectedNiches.join(","),
      video_published_days: videoPublishedDays,
      max_subs: maxSubs,
      min_views: minViews,
      max_channel_videos_total: maxChannelVideosTotal,
      page: pageNumber.toString(),
      page_size: apiPageSize.toString()
    };
    
    const params = new URLSearchParams(searchParams);
    
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
      const response = await fetch(`${backendUrl}/api/search/viral-videos?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP Error: ${response.status}`);
      }

      const responseData: ApiResponse = await response.json();
      const results = responseData.results || [];
      
      setAllResults(results);
      setApiCurrentPage(responseData.pagination.page);
      setCurrentPage(1); // Reset local pagination when changing API page
      
      console.log(`Carregada página ${responseData.pagination.page} de ${responseData.pagination.total_pages} (${results.length} resultados)`);
      
    } catch (err: any) {
      console.error("Failed to load page:", err);
      setError(err.message || "Failed to load page");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAndSortedResults = useMemo(() => {
    // If showing saved channels, return those instead
    if (showSavedChannels) {
      return [...savedChannels];
    }
    
    let filtered = [...allResults];
    if (platformFilter !== "all") {
      filtered = filtered.filter(result => result.platform === platformFilter);
    }
    switch (sortBy) {
      case "views_desc":
        filtered.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
        break;
      case "views_asc":
        filtered.sort((a, b) => (a.viewCount || 0) - (b.viewCount || 0));
        break;
      case "date_desc":
        filtered.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        break;
      case "date_asc":
        filtered.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
        break;
      default:
        break;
    }
    return filtered;
  }, [allResults, platformFilter, sortBy, savedChannels, showSavedChannels]);

  const totalPages = Math.ceil(filteredAndSortedResults.length / ITEMS_PER_PAGE);
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredAndSortedResults.slice(startIndex, endIndex);
  }, [filteredAndSortedResults, currentPage]);

  const handlePlatformFilterChange = (value: string) => {
    setPlatformFilter(value);
    setCurrentPage(1);
  };

  const handleSortByChange = (value: string) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (filteredAndSortedResults.length === 0) return;
    const csvData = Papa.unparse(filteredAndSortedResults, { header: true });
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `nich_results_${selectedNiches.join("_")}_${new Date().toISOString().split("T")[0]}.csv`);
  };

  const handleCheckout = async () => {
    setError(null);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
      const response = await fetch(`${backendUrl}/api/payment/create-checkout-session`, {
        method: "POST",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error creating checkout session");
      }
      const session = await response.json();
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Failed to load Stripe");
      }
      const { error } = await stripe.redirectToCheckout({
        sessionId: session.sessionId,
      });
      if (error) {
        console.error("Stripe checkout error:", error);
        setError(error.message || "Stripe checkout failed");
      }
    } catch (err: any) {
      console.error("Checkout failed:", err);
      setError(err.message || "Payment processing failed");
    }
  };

  const sidebarNavItems = [
    { nameKey: "Filters", icon: LayoutDashboard, href: "#", current: !showSavedChannels, onClick: () => setShowSavedChannels(false) },
    { nameKey: "Saved Channels", icon: BookmarkIcon, href: "#", current: showSavedChannels, onClick: () => setShowSavedChannels(true) },
  ];

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const calculateViralFactor = (views: number, subscribers: number): string => {
    if (subscribers === 0 || !subscribers) return "N/A";
    const factor = views / subscribers;
    return `${Math.round(factor)}x`;
  };

  const getNicheEmoji = (niche?: string): string => {
    // Enhanced emoji mapping
    if (!niche) return "📊";
    
    const nicheLC = niche.toLowerCase();
    
    if (nicheLC.includes("crypto")) return "💰";
    if (nicheLC.includes("gaming")) return "🎮";
    if (nicheLC.includes("food")) return "🍔";
    if (nicheLC.includes("travel")) return "✈️";
    if (nicheLC.includes("politics")) return "👔";
    if (nicheLC.includes("motivational")) return "💪";
    if (nicheLC.includes("basketball")) return "🏀";
    if (nicheLC.includes("finance")) return "💵";
    if (nicheLC.includes("history")) return "📜";
    if (nicheLC.includes("quiz")) return "❓";
    if (nicheLC.includes("animals")) return "🐾";
    if (nicheLC.includes("series") || nicheLC.includes("tv")) return "📺";
    if (nicheLC.includes("educational")) return "📚";
    if (nicheLC.includes("geography")) return "🌍";
    if (nicheLC.includes("horror")) return "👻";
    if (nicheLC.includes("fitness")) return "🏋️";
    if (nicheLC.includes("ranking")) return "📊";
    if (nicheLC.includes("reddit")) return "📱";
    if (nicheLC.includes("storytelling")) return "📖";
    if (nicheLC.includes("lifestyle")) return "🌿";
    
    return "📈"; // Default emoji
  };

  // Função para formatar números grandes (ex: 94.498.217 -> 94M)
  const formatLargeNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    } else {
      return num.toString();
    }
  };

  // Função para formatar data de forma mais legível
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day < 10 ? '0' + day : day}/${month < 10 ? '0' + month : month}/${year}`;
  };

  return (
    <>
      {/* Estilos globais para a barra de rolagem personalizada */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Estilização moderna da barra de rolagem */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.2);
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #f59e0b 30%, #b45309 100%);
          box-shadow: 0 0 5px rgba(245, 158, 11, 0.5);
        }
        
        /* Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #f59e0b rgba(0, 0, 0, 0.2);
        }
      `}} />
    
      <div className={`flex min-h-screen bg-custom-dark-bg text-custom-text-primary font-sans transition-all duration-300 ease-in-out`}>
        {showLangOverlay && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center transition-opacity duration-300 ease-in-out opacity-100"></div>
        )}
        <aside className={`bg-custom-card-bg p-4 fixed h-full flex flex-col border-r border-custom-border-color transition-all duration-300 ease-in-out ${isSidebarCollapsed ? "w-20" : "w-64"}`}>
          {/* Cabeçalho da barra lateral */}
          <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"} mb-4`}>
            {!isSidebarCollapsed && <h1 className="text-3xl font-bold text-custom-yellow-accent">NICHE</h1>}
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-custom-text-secondary hover:text-custom-yellow-accent hover:bg-custom-dark-bg">
              {isSidebarCollapsed ? <MenuIcon className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
            </Button>
          </div>
          
          {/* Estrutura da barra lateral com 3 partes: navegação, filtros (com rolagem) e rodapé fixo */}
          <div className="flex flex-col h-[calc(100%-60px)] relative">
            {/* 1. Navegação principal */}
            <nav className="mb-4">
              {sidebarNavItems.map((item) => (
                <a
                  key={item.nameKey}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    if (item.onClick) item.onClick();
                  }}
                  title={!isSidebarCollapsed ? "" : item.nameKey}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors mb-1 ${isSidebarCollapsed ? "justify-center" : ""} ${item.current ? "bg-custom-yellow-accent text-custom-text-on-yellow font-semibold" : "hover:bg-custom-dark-bg hover:text-custom-yellow-accent text-custom-text-secondary"}`}
                >
                  <item.icon className={`h-5 w-5 ${isSidebarCollapsed ? "mx-auto" : ""}`} />
                  {!isSidebarCollapsed && <span>{item.nameKey}</span>}
                </a>
              ))}
            </nav>
            
            {/* 2. Área de filtros com rolagem - altura calculada para deixar espaço para o rodapé */}
            {!isSidebarCollapsed && (
              <div className="overflow-hidden mb-20">
                <h3 className="text-sm font-semibold text-custom-text-secondary uppercase tracking-wider mb-2">Niche Filters</h3>
                <div className="grid grid-cols-1 gap-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1 custom-scrollbar">
                  {availableNiches.map((niche) => (
                    <div 
                      key={niche} 
                      className={`flex items-center p-1.5 rounded-md transition-all duration-200 ${
                        selectedNiches.includes(niche) 
                          ? "bg-custom-yellow-accent/10 border-l-2 border-custom-yellow-accent" 
                          : "hover:bg-custom-dark-bg/30 border-l-2 border-transparent"
                      }`}
                    >
                      <Checkbox
                        id={`niche-${niche}`}
                        checked={selectedNiches.includes(niche)}
                        onCheckedChange={() => handleNicheChange(niche)}
                        className="data-[state=checked]:bg-custom-yellow-accent data-[state=checked]:border-custom-yellow-accent mr-2"
                      />
                      <label
                        htmlFor={`niche-${niche}`}
                        className={`text-sm cursor-pointer flex items-center flex-1 ${
                          selectedNiches.includes(niche) ? "text-custom-yellow-accent font-medium" : "text-custom-text-primary"
                        }`}
                      >
                        <span className="mr-2 text-base">{getNicheEmoji(niche)}</span>
                        <span>{niche}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 3. Rodapé fixo da barra lateral - posicionamento absoluto para garantir visibilidade */}
            <div className={`absolute bottom-0 left-0 right-0 pt-3 border-t border-custom-border-color bg-custom-card-bg ${isSidebarCollapsed ? "px-0" : "px-0"}`}>
              {!isSidebarCollapsed && (
                <Button variant="outline" className="w-full bg-blue-500 hover:bg-blue-600 text-white border-blue-500 font-semibold mb-3">
                  <MessageCircle className="mr-2 h-4 w-4" /> Join Telegram Group
                </Button>
              )}
              
              {/* Botão de Logout renderizado diretamente, sem usar o loop */}
              <a
                href="#"
                title={!isSidebarCollapsed ? "" : "Logout"}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-custom-dark-bg hover:text-custom-yellow-accent text-custom-text-secondary transition-colors ${isSidebarCollapsed ? "justify-center" : ""}`}
              >
                <LogOut className={`h-5 w-5 ${isSidebarCollapsed ? "mx-auto" : ""}`} />
                {!isSidebarCollapsed && <span>Logout</span>}
              </a>
            </div>
          </div>
        </aside>

        <main className={`flex-1 p-6 md:p-10 overflow-y-auto transition-all duration-300 ease-in-out ${isSidebarCollapsed ? "ml-20" : "ml-64"}`}>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-semibold text-custom-text-primary">Welcome To Niche!</h2>
            </div>
          </div>

          {!showSavedChannels && (
            <Card className="mb-8 bg-custom-card-bg border border-custom-border-color shadow-lg rounded-lg overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-semibold text-custom-yellow-accent">Find viral niches on YouTube</CardTitle>
                <CardDescription className="text-custom-text-secondary">
                  Search for viral videos with advanced filters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-custom-text-secondary" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search for niches"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-custom-dark-bg border border-custom-border-color text-custom-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-custom-yellow-accent"
                    />
                  </div>
                  <Button 
                    onClick={handleSearch} 
                    className="bg-custom-yellow-accent text-custom-text-on-yellow hover:bg-custom-yellow-hover disabled:opacity-50 font-semibold rounded-md px-6 py-2.5"
                    disabled={isLoading || selectedNiches.length === 0 || (!isSubscribed && !checkingSubscription)}>
                    {isLoading ? "Searching..." : "Search Niches"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="videoPublishedDays" className="text-custom-text-secondary font-medium">Videos published in last days</Label>
                    <Select value={videoPublishedDays} onValueChange={setVideoPublishedDays}>
                      <SelectTrigger id="videoPublishedDays" className="bg-custom-dark-bg border-custom-border-color text-custom-text-primary hover:border-custom-yellow-accent focus:ring-custom-yellow-accent rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-custom-card-bg border-custom-border-color text-custom-text-primary rounded-md">
                        <SelectItem value="7" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">7 days</SelectItem>
                        <SelectItem value="14" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">14 days</SelectItem>
                        <SelectItem value="30" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">30 days</SelectItem>
                        <SelectItem value="60" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">60 days</SelectItem>
                        <SelectItem value="90" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxSubs" className="text-custom-text-secondary font-medium">Max. Channel Subscribers</Label>
                    <Select value={maxSubs} onValueChange={setMaxSubs}>
                      <SelectTrigger id="maxSubs" className="bg-custom-dark-bg border-custom-border-color text-custom-text-primary hover:border-custom-yellow-accent focus:ring-custom-yellow-accent rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-custom-card-bg border-custom-border-color text-custom-text-primary rounded-md">
                        <SelectItem value="1000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">1,000</SelectItem>
                        <SelectItem value="5000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">5,000</SelectItem>
                        <SelectItem value="10000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">10,000</SelectItem>
                        <SelectItem value="50000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">50,000</SelectItem>
                        <SelectItem value="100000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">100,000</SelectItem>
                        <SelectItem value="1000000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">1,000,000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minViews" className="text-custom-text-secondary font-medium">Min. Video Views</Label>
                    <Select value={minViews} onValueChange={setMinViews}>
                      <SelectTrigger id="minViews" className="bg-custom-dark-bg border-custom-border-color text-custom-text-primary hover:border-custom-yellow-accent focus:ring-custom-yellow-accent rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-custom-card-bg border-custom-border-color text-custom-text-primary rounded-md">
                        <SelectItem value="1000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">1,000</SelectItem>
                        <SelectItem value="5000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">5,000</SelectItem>
                        <SelectItem value="10000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">10,000</SelectItem>
                        <SelectItem value="50000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">50,000</SelectItem>
                        <SelectItem value="100000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">100,000</SelectItem>
                        <SelectItem value="1000000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">1,000,000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxChannelVideosTotal" className="text-custom-text-secondary font-medium">Max. Channel Videos Total</Label>
                    <Select value={maxChannelVideosTotal} onValueChange={setMaxChannelVideosTotal}>
                      <SelectTrigger id="maxChannelVideosTotal" className="bg-custom-dark-bg border-custom-border-color text-custom-text-primary hover:border-custom-yellow-accent focus:ring-custom-yellow-accent rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-custom-card-bg border-custom-border-color text-custom-text-primary rounded-md">
                        <SelectItem value="10" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">10 videos</SelectItem>
                        <SelectItem value="20" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">20 videos</SelectItem>
                        <SelectItem value="50" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">50 videos</SelectItem>
                        <SelectItem value="100" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">100 videos</SelectItem>
                        <SelectItem value="999999" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">No limit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="sortBy" className="text-custom-text-secondary font-medium whitespace-nowrap">Sort by:</Label>
                    <Select value={sortBy} onValueChange={handleSortByChange}>
                      <SelectTrigger id="sortBy" className="bg-custom-dark-bg border-custom-border-color text-custom-text-primary hover:border-custom-yellow-accent focus:ring-custom-yellow-accent rounded-md w-[180px]"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-custom-card-bg border-custom-border-color text-custom-text-primary rounded-md">
                        <SelectItem value="views_desc" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">Views (High to Low)</SelectItem>
                        <SelectItem value="views_asc" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">Views (Low to High)</SelectItem>
                        <SelectItem value="date_desc" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">Date (Newest First)</SelectItem>
                        <SelectItem value="date_asc" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">Date (Oldest First)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Label htmlFor="platformFilter" className="text-custom-text-secondary font-medium whitespace-nowrap">Platform:</Label>
                    <Select value={platformFilter} onValueChange={handlePlatformFilterChange} disabled>
                      <SelectTrigger id="platformFilter" className="bg-custom-dark-bg border-custom-border-color text-custom-text-primary hover:border-custom-yellow-accent focus:ring-custom-yellow-accent rounded-md w-[180px]"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-custom-card-bg border-custom-border-color text-custom-text-primary rounded-md">
                        <SelectItem value="all" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">All Platforms</SelectItem>
                        <SelectItem value="YouTube Shorts" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">YouTube Shorts</SelectItem>
                        <SelectItem value="TikTok" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">TikTok</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleExport}
                    disabled={filteredAndSortedResults.length === 0}
                    variant="outline"
                    className="bg-custom-dark-bg border-custom-border-color text-custom-text-primary hover:border-custom-yellow-accent hover:text-custom-yellow-accent rounded-md px-4 py-2"
                  >
                    Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-500 text-red-400 p-4 rounded-md mb-6">
              <p>{error}</p>
              {!isSubscribed && !checkingSubscription && (
                <Button onClick={handleCheckout} className="mt-2 bg-custom-yellow-accent text-custom-text-on-yellow hover:bg-custom-yellow-hover">
                  Subscribe Now
                </Button>
              )}
            </div>
          )}

          {showSavedChannels && savedChannels.length === 0 && (
            <div className="text-center py-12">
              <p className="text-custom-text-secondary text-lg">No saved channels yet.</p>
              <p className="text-custom-text-secondary mt-2">Search for videos and click the heart icon to save them.</p>
            </div>
          )}

          {/* Controles de paginação da API */}
          {!showSavedChannels && allResults.length > 0 && apiTotalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 my-6 bg-custom-card-bg border border-custom-border-color p-4 rounded-lg">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => loadApiPage(apiCurrentPage - 1)} 
                disabled={apiCurrentPage === 1 || isLoading}
                className="bg-custom-dark-bg border-custom-border-color text-custom-text-primary hover:border-custom-yellow-accent hover:text-custom-yellow-accent"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Página Anterior
              </Button>
              
              <div className="text-sm text-custom-text-primary">
                <span className="font-medium">Página {apiCurrentPage}</span> de {apiTotalPages} 
                <span className="text-custom-text-secondary ml-2">
                  ({apiTotalResults} resultados totais)
                </span>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => loadApiPage(apiCurrentPage + 1)} 
                disabled={apiCurrentPage === apiTotalPages || isLoading}
                className="bg-custom-dark-bg border-custom-border-color text-custom-text-primary hover:border-custom-yellow-accent hover:text-custom-yellow-accent"
              >
                Próxima Página <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-yellow-accent"></div>
            </div>
          ) : (
            <>
              {paginatedResults.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {paginatedResults.map((result, index) => (
                    <div 
                      key={`${result.videoLink}-${index}`} 
                      className="relative group bg-custom-card-bg border border-custom-border-color rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:border-custom-yellow-accent/50 max-w-[350px] cursor-pointer"
                      onClick={() => openVideoLink(result.videoLink)}
                    >
                      {/* Thumbnail com overlay */}
                      <div className="relative aspect-video">
                        <img 
                          src={result.thumbnailUrl || "https://via.placeholder.com/320x180?text=No+Thumbnail"} 
                          alt={result.videoTitle} 
                          className="w-full object-cover"
                        />
                        
                        {/* Tag de conteúdo */}
                        <div className="absolute top-2 right-2 bg-amber-500 text-black text-xs font-bold px-3 py-0.5 rounded-full flex items-center">
                          <span className="text-lg mr-2">{getNicheEmoji(result.niche)}</span>
                          <span className="text-sm">{result.niche || "Unknown"}</span>
                          <Flame className="h-4 w-4 mr-0 ml-2" />
                          {calculateViralFactor(result.viewCount, result.subscriberCount)}
                        </div>
                        
                        {/* Overlay com gradiente */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-3">
                          <h3 className="text-white font-semibold text-sm line-clamp-2 mb-1">{result.videoTitle}</h3>
                          <p className="text-gray-300 text-xs">{result.channelName}</p>
                          
                          {/* Data destacada */}
                          <div className="absolute bottom-3 right-3 bg-amber-500 text-black font-bold text-xs px-3 py-1.5 rounded-full">
                            {formatDate(result.publishedAt)}
                          </div>
                        </div>
                        
                        {/* Botão de favorito */}
                        <button 
                          onClick={(e) => toggleFavorite(e, result)} 
                          className="absolute top-2 left-2 bg-black/50 p-1.5 rounded-full hover:bg-black/70 transition-colors z-10"
                        >
                          <Heart 
                            className={`h-4 w-4 ${favoritedVideos.includes(result.videoLink) ? "fill-red-500 text-red-500" : "text-white"}`} 
                          />
                        </button>
                        
                        {/* Ícone de link externo para indicar que é clicável */}
                        <div className="absolute top-2 left-10 bg-black/50 p-1.5 rounded-full transition-opacity opacity-0 group-hover:opacity-100">
                          <ExternalLink className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      
                      {/* Estatísticas */}
                      <div className="grid grid-cols-3 divide-x divide-custom-border-color border-t border-custom-border-color">
                        <div className="bg-amber-500 text-black p-2 text-center">
                          <p className="text-xs font-semibold">VIEWS</p>
                          <p className="font-bold">{formatLargeNumber(result.viewCount)}</p>
                        </div>
                        <div className="p-2 text-center">
                          <p className="text-xs text-custom-text-secondary">LIKES</p>
                          <p className="font-medium text-custom-text-primary">{formatLargeNumber(result.likeCount || 0)}</p>
                        </div>
                        <div className="p-2 text-center">
                          <p className="text-xs text-custom-text-secondary">COMMENTS</p>
                          <p className="font-medium text-custom-text-primary">{formatLargeNumber(result.commentCount || 0)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !isLoading && !error && (
                  <div className="text-center py-12">
                    <p className="text-custom-text-secondary text-lg">No results found.</p>
                    <p className="text-custom-text-secondary mt-2">Try adjusting your search filters.</p>
                  </div>
                )
              )}

              {/* Paginação local (para navegação dentro dos resultados já carregados) */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 my-6">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                    disabled={currentPage === 1}
                    className="bg-custom-dark-bg border-custom-border-color text-custom-text-primary hover:border-custom-yellow-accent hover:text-custom-yellow-accent"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="text-sm text-custom-text-secondary">
                    Page {currentPage} of {totalPages}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                    disabled={currentPage === totalPages}
                    className="bg-custom-dark-bg border-custom-border-color text-custom-text-primary hover:border-custom-yellow-accent hover:text-custom-yellow-accent"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
