// src/app/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart, ListFilter, ArrowUpDown, ChevronLeft, ChevronRight, LayoutDashboard, Zap, DollarSign, MessageSquare, UserCircle, LogOut, Disc, MenuIcon, Flame } from "lucide-react";

import { saveAs } from "file-saver";
import Papa from "papaparse";
import { loadStripe } from "@stripe/stripe-js";

// Importações de tradução
import ptTranslations from "../../locales/pt.json";
import enTranslations from "../../locales/en.json";

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

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_51RK6VmGbde7HGq89NHb4oCLxCVsgZReaNSZoDga95udXG6OEBjh318rcDiq5YuBdmV1xyAFjwKgKLp2917dybuOj00ALSJuLD8";
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

const availableNiches = [
  "Motivacional", "Política", "FamilyGuy", "Basketball", "Finance", "History", "Quiz", "Animals",
  "Séries", "TV Shows", "Educacional", "Geography", "Horror Stories",
  "Fitness", "Ranking Content", "Reddit Stories", "Crypto", "Travel",
  "Storytelling", "Gaming", "Lifestyle", "Food & Drink"
];

const ITEMS_PER_PAGE = 20;

interface Translations {
  [key: string]: string;
}

const translations: { [key: string]: Translations } = {
  "pt-BR": ptTranslations,
  "en-US": enTranslations,
};

export default function Home() {
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [videoPublishedDays, setVideoPublishedDays] = useState("30");
  const [maxSubs, setMaxSubs] = useState("10000");
  const [minViews, setMinViews] = useState("50000");
  const [maxChannelVideosTotal, setMaxChannelVideosTotal] = useState("50");

  const [allResults, setAllResults] = useState<NichResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  const [favoritedVideos, setFavoritedVideos] = useState<string[]>([]);

  const [platformFilter, setPlatformFilter] = useState<string>("YouTube Shorts");
  const [sortBy, setSortBy] = useState<string>("views_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentLang, setCurrentLang] = useState("pt-BR");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showLangOverlay, setShowLangOverlay] = useState(false);

  const t = (key: string): string => {
    return translations[currentLang]?.[key] || key;
  };

  useEffect(() => {
    const checkSub = async () => {
      setCheckingSubscription(true);
      try {
        const query = new URLSearchParams(window.location.search);
        if (query.get("subscribed") === "true") {
          setIsSubscribed(true);
        }
      } catch (err) {
        console.error("Falha ao verificar assinatura:", err);
        setIsSubscribed(false);
      } finally {
        setCheckingSubscription(false);
      }
    };
    checkSub();
  }, []);

  const [initialSuggestions, setInitialSuggestions] = useState<NichResult[]>([]);

  {/* Nichos carregados aletaróriamente */}
  useEffect(() => {
    const fetchInitialSuggestions = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
        const randomNiches = ["Conteúdo de Ranking", "Fitness", "Crypto", "Animals", "Travel"];
        const response = await fetch(`${backendUrl}/api/search/viral-videos?niches=${randomNiches.join(",")}&video_published_days=30&min_views=10000&max_subs=50000&max_channel_videos_total=50`);
        const data: NichResult[] = await response.json();

        // Remover vídeos duplicados com base em videoLink
        const uniqueVideos = Array.from(new Map(data.map(item => [item.videoLink, item])).values());

        setInitialSuggestions(uniqueVideos.slice(0, 4)); // Apenas 4 vídeos únicos
      } catch (error) {
        console.error("Erro ao carregar sugestões iniciais:", error);
      }
    };

    fetchInitialSuggestions();
  }, []);



  const handleNicheChange = (niche: string) => {
    setSelectedNiches(prev =>
      prev.includes(niche) ? prev.filter(n => n !== niche) : [...prev, niche]
    );
    setCurrentPage(1);
  };

  const toggleFavorite = (videoLink: string) => {
    setFavoritedVideos(prev =>
      prev.includes(videoLink) ? prev.filter(link => link !== videoLink) : [...prev, videoLink]
    );
  };

  const handleSearch = async () => {
    if (!isSubscribed && !checkingSubscription) {
      setError(t("error_only_subscribers"));
      return;
    }
    if (selectedNiches.length === 0) {
      setError(t("error_select_niche"));
      return;
    }

    setIsLoading(true);
    setError(null);
    setAllResults([]);
    setCurrentPage(1);

    const searchParams = {
      niches: selectedNiches.join(","),
      video_published_days: videoPublishedDays,
      max_subs: maxSubs,
      min_views: minViews,
      max_channel_videos_total: maxChannelVideosTotal,
    };

    const params = new URLSearchParams(searchParams);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
      const response = await fetch(`${backendUrl}/api/search/viral-videos?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const data: NichResult[] = await response.json();
      setAllResults(data);

    } catch (err: any) {
      console.error(t("error_search_failed"), err);
      setError(err.message || t("error_fetch_data"));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAndSortedResults = useMemo(() => {
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
  }, [allResults, platformFilter, sortBy]);

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
        throw new Error(errorData.error || t("error_checkout_session"));
      }
      const session = await response.json();
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error(t("error_stripe_load"));
      }
      const { error } = await stripe.redirectToCheckout({
        sessionId: session.sessionId,
      });
      if (error) {
        console.error("Erro no checkout Stripe:", error);
        setError(error.message || t("error_stripe_checkout"));
      }
    } catch (err: any) {
      console.error("Falha no checkout:", err);
      setError(err.message || t("error_payment_generic"));
    }
  };


  const sidebarNavItems = [
  { nameKey: "sidebar_dashboard", icon: LayoutDashboard, href: "#", current: true },
  { nameKey: "sidebar_outlier", icon: Zap, href: "#", current: false, new: true },
  { nameKey: "sidebar_viral_simulator", icon: Flame, href: "#", current: false, soon: true },
];


 // const sidebarNavItems = [
 //   { nameKey: "sidebar_dashboard", icon: LayoutDashboard, href: "#", current: true },
   // { nameKey: "sidebar_creator_search", icon: Search, href: "#", current: false },
   // { nameKey: "sidebar_find_editor", icon: Users, href: "#", current: false },
   // { nameKey: "sidebar_collections", icon: Folder, href: "#", current: false },
//    { nameKey: "sidebar_outlier", icon: Zap, href: "#", current: false, new: true },
   // { nameKey: "sidebar_viral_simulator", icon: TrendingUp, href: "#", current: false, soon: true },
  //  { nameKey: "sidebar_billing", icon: DollarSign, href: "#", current: false },
//  ];

  const sidebarBottomNavItems = [
    { nameKey: "sidebar_feedback", icon: MessageSquare, href: "#" },
    { nameKey: "sidebar_account", icon: UserCircle, href: "#" },
    { nameKey: "sidebar_logout", icon: LogOut, href: "#" },
  ];

  const changeLanguage = (lang: string) => {
    if (lang === currentLang) return;
    setShowLangOverlay(true);
    setTimeout(() => {
      setCurrentLang(lang);
      setShowLangOverlay(false);
    }, 400);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const calculateViralFactor = (views: number, subscribers: number): string => {
    if (subscribers === 0 || !subscribers) return "N/A";
    const factor = views / subscribers;
    return `${Math.round(factor)}x`;
  };

  const getNicheEmoji = (niche?: string): string => {
    // Mapeamento simples, pode ser expandido
    if (niche?.toLowerCase().includes("crypto")) return "💰";
    if (niche?.toLowerCase().includes("gaming")) return "🎮";
    if (niche?.toLowerCase().includes("food")) return "🍔";
    if (niche?.toLowerCase().includes("travel")) return "✈️";
    return "😊"; // Emoji padrão como na referência
  };

  return (
    <div className={`flex min-h-screen bg-custom-dark-bg text-custom-text-primary font-sans transition-all duration-300 ease-in-out`}>
      {showLangOverlay && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center transition-opacity duration-300 ease-in-out opacity-100"></div>
      )}
      <aside className={`bg-custom-card-bg p-4 space-y-6 fixed h-full flex flex-col justify-between border-r border-custom-border-color transition-all duration-300 ease-in-out ${isSidebarCollapsed ? "w-20" : "w-64"}`}>
        <div>
          <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"} mb-10`}>
            {!isSidebarCollapsed && <h1 className="text-3xl font-bold text-custom-yellow-accent">NICHE</h1>}
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-custom-text-secondary hover:text-custom-yellow-accent hover:bg-custom-dark-bg">
              {isSidebarCollapsed ? <MenuIcon className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
            </Button>
          </div>
          <nav className="space-y-2">
            {sidebarNavItems.map((item) => (
              <a
                key={item.nameKey}
                href={item.href}
                title={!isSidebarCollapsed ? "" : t(item.nameKey)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${isSidebarCollapsed ? "justify-center" : ""} ${item.current ? "bg-custom-yellow-accent text-custom-text-on-yellow font-semibold" : "hover:bg-custom-dark-bg hover:text-custom-yellow-accent text-custom-text-secondary"}`}
              >
                <item.icon className={`h-5 w-5 ${isSidebarCollapsed ? "mx-auto" : ""}`} />
                {!isSidebarCollapsed && <span>{t(item.nameKey)}</span>}
                {!isSidebarCollapsed && item.new && <span className="ml-auto text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full">{t("new_badge")}</span>}
                {!isSidebarCollapsed && item.soon && <span className="ml-auto text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full">{t("soon_badge")}</span>}
              </a>
            ))}
          </nav>
        </div>
        <div>
          <nav className="space-y-2 mb-4">
            {sidebarBottomNavItems.map((item) => (
              <a
                key={item.nameKey}
                href={item.href}
                title={!isSidebarCollapsed ? "" : t(item.nameKey)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-custom-dark-bg hover:text-custom-yellow-accent text-custom-text-secondary transition-colors ${isSidebarCollapsed ? "justify-center" : ""}`}
              >
                <item.icon className={`h-5 w-5 ${isSidebarCollapsed ? "mx-auto" : ""}`} />
                {!isSidebarCollapsed && <span>{t(item.nameKey)}</span>}
              </a>
            ))}
          </nav>
          {!isSidebarCollapsed && (
            <>
              <Button variant="outline" className="w-full mb-2 bg-green-500 hover:bg-green-600 text-white border-green-500 font-semibold">
                <DollarSign className="mr-2 h-4 w-4" /> {t("sidebar_affiliate_program")}
              </Button>
              <Button variant="outline" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 font-semibold">
                <Disc className="mr-2 h-4 w-4" /> {t("sidebar_join_discord")}
              </Button>
            </>
          )}
        </div>
      </aside>

      <main className={`flex-1 p-6 md:p-10 overflow-y-auto transition-all duration-300 ease-in-out ${isSidebarCollapsed ? "ml-20" : "ml-64"}`}>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-semibold text-custom-text-primary">{t("welcome_back")}</h2>
{/* NOVA SEÇÃO: Nichos clicáveis visíveis */}
        <div className="flex flex-wrap gap-3 mb-10">
          {availableNiches.map((niche) => (
            <Button
              key={niche}
              onClick={() => handleNicheChange(niche)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors shadow-sm ${
                selectedNiches.includes(niche)
                  ? "bg-pink-600 text-white border-pink-600"
                  : "bg-custom-card-bg text-custom-text-secondary border-custom-border-color hover:border-pink-500 hover:text-pink-500"
              }`}
            >
              <span>{getNicheEmoji(niche)}</span>
              <span>{t(niche.toLowerCase().replace(/\s|&/g, "_"))}</span>
            </Button>
          ))}
        </div>

          </div>
          <div className="flex items-center space-x-4">
            <button onClick={() => changeLanguage("pt-BR")} title={t("portuguese_brazil")} className={`p-1 rounded-md ${currentLang === "pt-BR" ? "bg-custom-yellow-accent ring-2 ring-custom-yellow-hover" : "hover:bg-custom-card-bg"}`}>
              <img src="/assets/images/flag_br.png" alt={t("portuguese_brazil")} className="w-8 h-5 object-cover rounded" />
            </button>
            <button onClick={() => changeLanguage("en-US")} title={t("english")} className={`p-1 rounded-md ${currentLang === "en-US" ? "bg-custom-yellow-accent ring-2 ring-custom-yellow-hover" : "hover:bg-custom-card-bg"}`}>
              <img src="/assets/images/flag_uk.png" alt={t("english")} className="w-8 h-5 object-cover rounded" />
            </button>
            <img src="/assets/images/profile_placeholder.png" alt={t("user_avatar")} className="w-10 h-10 rounded-full border-2 border-custom-yellow-accent object-cover" />
          </div>
        </div>
{/* CARDS ALEATÓRIOS DA BUSCA     */}
        {initialSuggestions.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-custom-yellow-accent mb-4">
              {t("Vídeos virais do momento") || "Vídeos virais do momento"}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {initialSuggestions.map((result, index) => (
                <Card key={`${result.videoLink}-${index}`} className="bg-custom-card-bg border border-custom-border-color hover:border-custom-yellow-accent rounded-xl overflow-hidden shadow-md">
                  <a href={result.videoLink} target="_blank" rel="noopener noreferrer">
                    {result.thumbnailUrl && (
                      <img src={result.thumbnailUrl} alt={result.videoTitle} className="w-full aspect-video object-cover" />
                    )}
                  </a>
                  <CardContent className="p-3">
                    <h3 className="text-sm font-semibold line-clamp-2 text-custom-text-primary">{result.videoTitle}</h3>
                    <p className="text-xs text-custom-text-secondary mt-1">{result.channelName}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}


        {!isSubscribed && !checkingSubscription && (
          <Card className="mb-8 bg-custom-yellow-accent border-custom-yellow-hover">
            <CardHeader><CardTitle className="text-custom-text-on-yellow">{t("premium_access")}</CardTitle></CardHeader>
            <CardContent><p className="text-custom-text-on-yellow">{t("unlock_niche_search")}</p></CardContent>
            <CardFooter><Button onClick={handleCheckout} className="bg-custom-card-bg text-custom-yellow-accent hover:bg-opacity-80 font-semibold">{t("subscribe_now")}</Button></CardFooter>
          </Card>
        )}

        <Card className="mb-8 bg-custom-card-bg border-custom-border-color shadow-xl rounded-lg">
          <CardHeader>
            <CardTitle className="text-custom-yellow-accent text-2xl">{t("find_viral_niches_youtube")}</CardTitle>
            <CardDescription className="text-custom-text-secondary">{t("search_viral_videos")}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            <div className="space-y-2 md:col-span-2 lg:col-span-1">
              <Label htmlFor="niches" className="text-custom-text-secondary font-medium">{t("niches_select_one_or_more")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left bg-custom-dark-bg border-custom-border-color text-custom-text-primary hover:bg-gray-700 hover:border-custom-yellow-accent focus:ring-custom-yellow-accent rounded-md">
                    {selectedNiches.length > 0 ? selectedNiches.map(n => t(n.toLowerCase().replace(/\s|&/g, "_"))).join(", ") : t("select_niches")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] max-h-60 overflow-y-auto p-0 bg-custom-card-bg border-custom-border-color rounded-md">
                  <div className="p-2 space-y-1">
                    {availableNiches.map((niche) => (
                      <div key={niche} className="flex items-center space-x-2 p-1.5 hover:bg-custom-dark-bg rounded-md cursor-pointer" onClick={() => handleNicheChange(niche)}>
                        <Checkbox
                          id={`niche-${niche}`}
                          checked={selectedNiches.includes(niche)}
                          onCheckedChange={() => handleNicheChange(niche)}
                          className="border-custom-border-color data-[state=checked]:bg-custom-yellow-accent data-[state=checked]:text-custom-text-on-yellow data-[state=checked]:border-custom-yellow-accent rounded"
                        />
                        <Label htmlFor={`niche-${niche}`} className="font-normal cursor-pointer flex-1 text-custom-text-primary">
                          {t(niche.toLowerCase().replace(/\s|&/g, "_"))}
                        </Label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="videoPublishedDays" className="text-custom-text-secondary font-medium">{t("videos_published_last_days")}</Label>
              <Select value={videoPublishedDays} onValueChange={setVideoPublishedDays}>
                <SelectTrigger id="videoPublishedDays" className="bg-custom-dark-bg border-custom-border-color text-custom-text-primary hover:border-custom-yellow-accent focus:ring-custom-yellow-accent rounded-md"><SelectValue placeholder={t("select_placeholder")} /></SelectTrigger>
                <SelectContent className="bg-custom-card-bg border-custom-border-color text-custom-text-primary rounded-md">
                  <SelectItem value="7" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("days_7")}</SelectItem>
                  <SelectItem value="30" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("days_30")}</SelectItem>
                  <SelectItem value="90" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("days_90")}</SelectItem>
                  <SelectItem value="180" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("days_180")}</SelectItem>
                  <SelectItem value="365" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("days_365")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxSubs" className="text-custom-text-secondary font-medium">{t("max_subscribers_channel")}</Label>
              <Select value={maxSubs} onValueChange={setMaxSubs}>
                <SelectTrigger id="maxSubs" className="bg-custom-dark-bg border-custom-border-color text-custom-text-primary hover:border-custom-yellow-accent focus:ring-custom-yellow-accent rounded-md"><SelectValue placeholder={t("select_placeholder")} /></SelectTrigger>
                <SelectContent className="bg-custom-card-bg border-custom-border-color text-custom-text-primary rounded-md">
                  <SelectItem value="1000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("subs_1k")}</SelectItem>
                  <SelectItem value="5000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("subs_5k")}</SelectItem>
                  <SelectItem value="10000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("subs_10k")}</SelectItem>
                  <SelectItem value="25000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("subs_25k")}</SelectItem>
                  <SelectItem value="50000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("subs_50k")}</SelectItem>
                  <SelectItem value="100000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("subs_100k")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minViews" className="text-custom-text-secondary font-medium">{t("min_views_video")}</Label>
              <Select value={minViews} onValueChange={setMinViews}>
                <SelectTrigger id="minViews" className="bg-custom-dark-bg border-custom-border-color text-custom-text-primary hover:border-custom-yellow-accent focus:ring-custom-yellow-accent rounded-md"><SelectValue placeholder={t("select_placeholder")} /></SelectTrigger>
                <SelectContent className="bg-custom-card-bg border-custom-border-color text-custom-text-primary rounded-md">
                  <SelectItem value="1000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("views_1k")}</SelectItem>
                  <SelectItem value="5000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("views_5k")}</SelectItem>
                  <SelectItem value="10000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("views_10k")}</SelectItem>
                  <SelectItem value="25000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("views_25k")}</SelectItem>
                  <SelectItem value="50000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("views_50k")}</SelectItem>
                  <SelectItem value="100000" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("views_100k")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxChannelVideosTotal" className="text-custom-text-secondary font-medium">{t("max_videos_channel_total")}</Label>
              <Select value={maxChannelVideosTotal} onValueChange={setMaxChannelVideosTotal}>
                <SelectTrigger id="maxChannelVideosTotal" className="bg-custom-dark-bg border-custom-border-color text-custom-text-primary hover:border-custom-yellow-accent focus:ring-custom-yellow-accent rounded-md"><SelectValue placeholder={t("select_placeholder")} /></SelectTrigger>
                <SelectContent className="bg-custom-card-bg border-custom-border-color text-custom-text-primary rounded-md">
                  <SelectItem value="10" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("videos_10")}</SelectItem>
                  <SelectItem value="20" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("videos_20")}</SelectItem>
                  <SelectItem value="30" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("videos_30")}</SelectItem>
                  <SelectItem value="50" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("videos_50")}</SelectItem>
                  <SelectItem value="100" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("videos_100")}</SelectItem>
                  <SelectItem value="999999" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("no_limit")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-4 pt-6">
            <Button 
              onClick={handleExport} 
              variant="outline" 
              className="border-custom-yellow-accent text-custom-yellow-accent hover:bg-custom-yellow-accent hover:text-custom-text-on-yellow disabled:opacity-50 font-semibold rounded-md px-6 py-2.5"
              disabled={filteredAndSortedResults.length === 0 || isLoading || (!isSubscribed && !checkingSubscription)}>
              {t("export_csv")}
            </Button>
            <Button 
              onClick={handleSearch} 
              className="bg-custom-yellow-accent text-custom-text-on-yellow hover:bg-custom-yellow-hover disabled:opacity-50 font-semibold rounded-md px-6 py-2.5"
              disabled={isLoading || selectedNiches.length === 0 || (!isSubscribed && !checkingSubscription)}>
              {isLoading ? t("searching") : t("search_niches")}
            </Button>
          </CardFooter>
        </Card>

        {error && (
          <Card className="mb-8 bg-red-900/30 border-red-700 text-custom-text-primary rounded-lg">
            <CardHeader><CardTitle className="text-red-400">{t("error_title")}</CardTitle></CardHeader>
            <CardContent><p>{error}</p></CardContent>
          </Card>
        )}

        {isLoading && <p className="text-center text-custom-text-secondary py-10 text-lg">{t("loading_results")}</p>}

        {!isLoading && allResults.length > 0 && (isSubscribed || checkingSubscription) && (
          <div className="mt-10">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <h2 className="text-2xl font-semibold text-custom-yellow-accent">{t("Número de resultados")} ({filteredAndSortedResults.length})</h2>
              <div className="flex items-center gap-4">
                <Select value={platformFilter} onValueChange={handlePlatformFilterChange} disabled={true}>
                  <SelectTrigger className="w-auto sm:w-[200px] bg-custom-dark-bg border-custom-border-color text-custom-text-primary disabled:opacity-70 hover:border-custom-yellow-accent focus:ring-custom-yellow-accent rounded-md">
                    <ListFilter className="h-4 w-4 mr-2 text-custom-yellow-accent" />
                    <SelectValue placeholder={t("filter_by_platform")} />
                  </SelectTrigger>
                  <SelectContent className="bg-custom-card-bg border-custom-border-color text-custom-text-primary rounded-md">
                    <SelectItem value="YouTube Shorts" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">YouTube Shorts</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={handleSortByChange}>
                  <SelectTrigger className="w-auto sm:w-[200px] bg-custom-dark-bg border-custom-border-color text-custom-text-primary hover:border-custom-yellow-accent focus:ring-custom-yellow-accent rounded-md">
                    <ArrowUpDown className="h-4 w-4 mr-2 text-custom-yellow-accent" />
                    <SelectValue placeholder={t("sort_by")} />
                  </SelectTrigger>
                  <SelectContent className="bg-custom-card-bg border-custom-border-color text-custom-text-primary rounded-md">
                    <SelectItem value="views_desc" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("most_viewed")}</SelectItem>
                    <SelectItem value="views_asc" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("least_viewed")}</SelectItem>
                    <SelectItem value="date_desc" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("most_recent")}</SelectItem>
                    <SelectItem value="date_asc" className="hover:bg-custom-dark-bg hover:text-custom-yellow-accent">{t("least_recent")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedResults.map((result, index) => (
                <Card key={`${result.videoLink}-${index}`} className="flex flex-col bg-custom-card-bg border border-custom-border-color hover:border-custom-yellow-accent transition-all duration-200 ease-in-out shadow-lg hover:shadow-custom-yellow-accent/20 rounded-xl overflow-hidden">
                  <CardHeader className="p-0 relative">
                    {result.thumbnailUrl && (
                      <a href={result.videoLink} target="_blank" rel="noopener noreferrer" className="block aspect-video">
                        <img
                          src={result.thumbnailUrl}
                          alt={`Thumbnail for ${result.videoTitle}`}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    )}
                    {/* Badges de Fator Viral e Gênero */}
                    <div className="absolute top-2 right-2 flex flex-col items-end space-y-1.5 z-10">
                      <div className="flex items-center bg-orange-500/80 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded-full shadow-md">
                        <Flame className="w-3.5 h-3.5 mr-1 text-white" />
                        <span>{calculateViralFactor(result.viewCount, result.subscriberCount)}</span>
                      </div>
                      {result.niche && (
                        <div className="flex items-center bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-md">
                          <span className="mr-1.5 text-sm">{getNicheEmoji(result.niche)}</span>
                          <span>{t(result.niche.toLowerCase().replace(/\s|&/g, "_"))}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 left-3 bg-black/70 hover:bg-black/90 text-custom-yellow-accent rounded-full h-9 w-9 flex items-center justify-center z-10"
                      onClick={() => toggleFavorite(result.videoLink)}
                    >
                      <Heart className={`h-5 w-5 ${favoritedVideos.includes(result.videoLink) ? "fill-custom-yellow-accent text-custom-yellow-accent" : "text-custom-yellow-accent"}`} />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 flex-grow flex flex-col">
                    <h3 className="font-semibold text-base leading-snug mb-1.5 text-custom-text-primary">
                      <a href={result.videoLink} target="_blank" rel="noopener noreferrer" title={result.videoTitle} className="hover:text-custom-yellow-accent line-clamp-2">
                        {result.videoTitle || t("title_unavailable")}
                      </a>
                    </h3>
                    <p className="text-sm text-custom-text-secondary mb-2">
                      <a href={result.channelLink} target="_blank" rel="noopener noreferrer" className="hover:text-custom-yellow-accent">
                        {result.channelName || t("channel_unknown")}
                      </a>
                    </p>
                    <div className="text-xs text-custom-text-secondary space-x-2 mb-3 flex items-center flex-wrap gap-y-1">
                      <span>{new Date(result.publishedAt).toLocaleDateString()}</span>
                      <span className="text-custom-yellow-accent font-medium">{result.platform}</span>
                      {/* O nicho agora é exibido no badge superior */}
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 text-xs text-custom-text-secondary grid grid-cols-3 gap-2 border-t border-custom-border-color mt-auto">
                    <div className="text-center py-2">
                      <p className="font-bold text-sm text-custom-text-primary">{Number(result.viewCount || 0).toLocaleString()}</p>
                      <p className="text-custom-text-secondary">{t("views")}</p>
                    </div>
                    <div className="text-center py-2 border-x border-custom-border-color">
                      <p className="font-bold text-sm text-custom-text-primary">{Number(result.likeCount || 0).toLocaleString()}</p>
                      <p className="text-custom-text-secondary">{t("likes")}</p>
                    </div>
                    <div className="text-center py-2">
                      <p className="font-bold text-sm text-custom-text-primary">{Number(result.commentCount || 0).toLocaleString()}</p>
                      <p className="text-custom-text-secondary">{t("comments")}</p>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex justify-center items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="bg-custom-card-bg border-custom-border-color text-custom-yellow-accent hover:bg-custom-dark-bg hover:border-custom-yellow-accent disabled:opacity-50 rounded-md w-9 h-9"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="icon"
                    onClick={() => setCurrentPage(page)}
                    className={`${currentPage === page 
                      ? "bg-custom-yellow-accent text-custom-text-on-yellow hover:bg-custom-yellow-hover font-semibold"
                      : "bg-custom-card-bg border-custom-border-color text-custom-text-secondary hover:border-custom-yellow-accent hover:text-custom-yellow-accent"} rounded-md w-9 h-9`}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="bg-custom-card-bg border-custom-border-color text-custom-yellow-accent hover:bg-custom-dark-bg hover:border-custom-yellow-accent disabled:opacity-50 rounded-md w-9 h-9"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        )}

        {!isLoading && allResults.length === 0 && !error && (isSubscribed || checkingSubscription) && (
          <p className="text-center mt-10 text-custom-text-secondary text-lg">{t("no_results_found")}</p>
        )}
      </main>
    </div>
  );
}

