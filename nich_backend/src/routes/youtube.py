# src/routes/youtube.py

import os
import json
import time # Adicionado para logs de tempo
from flask import Blueprint, request, jsonify, current_app # Import current_app for logging
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
import math

# Carregar variáveis de ambiente do arquivo .env
load_dotenv()

# Configurar Blueprint para organizar as rotas relacionadas ao YouTube
youtube_bp = Blueprint("youtube", __name__, url_prefix="/api/youtube")

# Constantes da API do YouTube
API_KEY = os.getenv("YOUTUBE_API_KEY")
API_SERVICE_NAME = "youtube"
API_VERSION = "v3"

# --- Funções Auxiliares (Helpers) ---

def get_youtube_client():
    """Inicializa e retorna um cliente para a API do YouTube Data v3."""
    current_app.logger.info("Tentando inicializar cliente do YouTube...")
    if not API_KEY:
        current_app.logger.error("Erro Crítico: Chave da API do YouTube (YOUTUBE_API_KEY) não configurada no .env")
        return None
    try:
        youtube = build(API_SERVICE_NAME, API_VERSION, developerKey=API_KEY)
        current_app.logger.info("Cliente do YouTube inicializado com sucesso.")
        return youtube
    except HttpError as e:
        current_app.logger.error(f"Erro HTTP ao inicializar cliente do YouTube: {e.resp.status} {e.content}")
        return None
    except Exception as e:
        current_app.logger.error(f"Erro genérico ao inicializar cliente do YouTube: {e}")
        return None

def handle_api_error(e):
    """Trata erros ocorridos durante chamadas à API do YouTube."""
    error_message = "Erro ao processar requisição na API do YouTube"
    status_code = 500
    details = str(e)
    if isinstance(e, HttpError):
        try:
            error_content = json.loads(e.content)
            details = error_content.get("error", {})
            error_message = details.get("message", error_message)
            if e.resp.status == 403 and any("quotaExceeded" in reason.get("reason", "") for reason in details.get("errors", [])):
                error_message = "Quota da API do YouTube excedida. Tente novamente mais tarde."
                status_code = 429
            elif e.resp.status == 400:
                 error_message = "Requisição inválida para a API do YouTube. Verifique os parâmetros."
                 status_code = 400
            else:
                status_code = e.resp.status
        except (json.JSONDecodeError, AttributeError):
            details = str(e.content)
            status_code = e.resp.status if hasattr(e, "resp") else 500
        current_app.logger.error(f"Erro na API do YouTube: {status_code} - {error_message} - Details: {details}")
        return jsonify({"error": error_message, "details": details}), status_code
    else:
        current_app.logger.error(f"Erro inesperado ao interagir com a API do YouTube: {e}")
        return jsonify({"error": error_message, "details": details}), status_code

def parse_iso_datetime(date_string):
    """Converte uma string de data/hora ISO 8601 para um objeto datetime com timezone."""
    if not date_string: return None
    try:
        return datetime.fromisoformat(date_string.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        current_app.logger.warning(f"Falha ao parsear data ISO: {date_string}")
        return None

def fetch_channel_details_batch(youtube, channel_ids):
    """Busca detalhes de múltiplos canais em uma única chamada."""
    current_app.logger.info(f"Buscando detalhes para o lote de canais: {channel_ids}")
    if not channel_ids: return []
    try:
        channel_response = youtube.channels().list(part="snippet,statistics", id=",".join(channel_ids)).execute()
        current_app.logger.info(f"Detalhes do lote de canais obtidos. Itens: {len(channel_response.get('items', []))}")
        return channel_response.get("items", [])
    except Exception as e:
        current_app.logger.error(f"Erro ao buscar detalhes do lote de canais {channel_ids}: {e}")
        return []

def fetch_channel_videos_paginated(youtube, channel_id, max_total_videos=100, videos_per_page=50):
    """Busca os vídeos mais recentes de um canal, com paginação."""
    current_app.logger.info(f"Buscando vídeos para o canal {channel_id} (max_total_videos={max_total_videos}, videos_per_page={videos_per_page})")
    videos = []
    next_page_token = None
    pages_to_fetch = math.ceil(max_total_videos / min(videos_per_page, 50))
    videos_per_page = min(videos_per_page, 50)
    page_count = 0

    for _ in range(pages_to_fetch):
        page_count += 1
        current_app.logger.info(f"Canal {channel_id}: Buscando página {page_count}/{pages_to_fetch} de vídeos...")
        try:
            search_response = youtube.search().list(
                part="snippet", channelId=channel_id, type="video", order="date",
                maxResults=videos_per_page, pageToken=next_page_token
            ).execute()
            video_items = search_response.get("items", [])
            video_ids = [item["id"]["videoId"] for item in video_items if item.get("id", {}).get("videoId")]
            current_app.logger.info(f"Canal {channel_id}, Página {page_count}: {len(video_ids)} IDs de vídeo encontrados.")

            if not video_ids: break

            video_response = youtube.videos().list(part="snippet,statistics", id=",".join(video_ids)).execute()
            video_details_map = {item["id"]: item for item in video_response.get("items", [])}
            current_app.logger.info(f"Canal {channel_id}, Página {page_count}: Detalhes para {len(video_details_map)} vídeos obtidos.")

            for item in video_items:
                video_id = item.get("id", {}).get("videoId")
                if video_id in video_details_map:
                    video_data = video_details_map[video_id]
                    snippet = video_data.get("snippet", {})
                    statistics = video_data.get("statistics", {})
                    view_count_str = statistics.get("viewCount")
                    view_count = None
                    if view_count_str is not None: 
                        try: view_count = int(view_count_str)
                        except (ValueError, TypeError): pass
                    videos.append({
                        "videoId": video_id, "title": snippet.get("title"),
                        "publishedAt": snippet.get("publishedAt"),
                        "thumbnail": snippet.get("thumbnails", {}).get("default", {}).get("url"),
                        "viewCount": view_count, "channelId": snippet.get("channelId")
                    })
                    if len(videos) >= max_total_videos: 
                        current_app.logger.info(f"Canal {channel_id}: Limite de {max_total_videos} vídeos atingido.")
                        return videos
            next_page_token = search_response.get("nextPageToken")
            if not next_page_token: 
                current_app.logger.info(f"Canal {channel_id}: Não há mais páginas de vídeos.")
                break
            current_app.logger.info(f"Canal {channel_id}: Próximo pageToken para vídeos: {next_page_token}")
        except Exception as e:
            current_app.logger.error(f"Erro ao buscar vídeos da página {page_count} para o canal {channel_id}: {e}")
            break
    current_app.logger.info(f"Canal {channel_id}: Total de {len(videos)} vídeos coletados.")
    return videos

def calculate_views_per_subscriber(view_count, subscriber_count):
    """Calcula visualizações por inscrito."""
    if subscriber_count and subscriber_count > 0 and view_count is not None:
        try: return round(int(view_count) / int(subscriber_count), 2)
        except (ValueError, TypeError, ZeroDivisionError): return 0.0
    return 0.0

@youtube_bp.route("/find_niches", methods=["GET"])
def find_niches():
    """Endpoint principal para buscar nichos no YouTube."""
    start_time = time.time()
    current_app.logger.info(f"Iniciando find_niches com parâmetros: {request.args}")
    keywords = request.args.get("keywords")
    video_published_within_days = request.args.get("video_published_days", default=90, type=int)
    max_subscribers = request.args.get("max_subs", default=10000, type=int)
    min_video_views = request.args.get("min_views", default=50000, type=int)
    max_total_videos_in_channel = request.args.get("max_channel_videos_total", default=999999, type=int)
    max_channels_to_process = request.args.get("max_channels", default=50, type=int)
    max_videos_per_channel_to_analyze = request.args.get("max_videos", default=20, type=int)

    if not keywords: return jsonify({"error": "Parâmetro \"keywords\" é obrigatório"}), 400
    
    max_channels_to_process = min(max_channels_to_process, 50)
    max_videos_per_channel_to_analyze = min(max_videos_per_channel_to_analyze, 50)
    current_app.logger.info(f"Parâmetros validados: keywords=\"{keywords}\", video_published_days={video_published_within_days}, max_subs={max_subscribers}, min_video_views={min_video_views}, max_channel_videos_total={max_total_videos_in_channel}, max_channels_to_process={max_channels_to_process}, max_videos_to_analyze={max_videos_per_channel_to_analyze}")

    youtube = get_youtube_client()
    if not youtube: return jsonify({"error": "Falha ao conectar com a API do YouTube."}), 500

    try:
        current_app.logger.info(f"Buscando canais com keywords: \"{keywords}\" (max_channels_to_process={max_channels_to_process})")
        search_response = youtube.search().list(q=keywords, part="snippet", type="channel", maxResults=max_channels_to_process).execute()
        initial_channels_data = search_response.get("items", [])
        current_app.logger.info(f"{len(initial_channels_data)} canais encontrados na busca inicial.")
        initial_channels = [{"channelId": item["id"]["channelId"]} for item in initial_channels_data if item.get("id", {}).get("channelId")]
        if not initial_channels: 
            current_app.logger.info(f"Nenhum ID de canal válido encontrado para keywords: {keywords}")
            return jsonify([])
        current_app.logger.info(f"{len(initial_channels)} IDs de canais válidos para processar.")

        filtered_channels_info = {}
        channel_ids_to_fetch = [c["channelId"] for c in initial_channels]
        batch_size = 50
        current_app.logger.info(f"Iniciando busca de detalhes para {len(channel_ids_to_fetch)} canais em lotes de {batch_size}.")
        
        for i in range(0, len(channel_ids_to_fetch), batch_size):
            batch_ids = channel_ids_to_fetch[i:i + batch_size]
            current_app.logger.info(f"Processando lote de IDs de canal: {batch_ids}")
            channel_details_batch = fetch_channel_details_batch(youtube, batch_ids)
            
            for item in channel_details_batch:
                channel_id = item.get("id")
                snippet = item.get("snippet", {})
                statistics = item.get("statistics", {})
                
                channel_title_for_log = snippet.get("title", "N/A")
                current_app.logger.info(f"--- Avaliando Canal ID: {channel_id}, Título: {channel_title_for_log} ---")

                subscriber_count_str = statistics.get("subscriberCount")
                hidden_subscriber_count = statistics.get("hiddenSubscriberCount", False)
                subscriber_count = None
                if not hidden_subscriber_count and subscriber_count_str is not None:
                    try: 
                        subscriber_count = int(subscriber_count_str)
                    except (ValueError, TypeError): 
                        current_app.logger.warning(f"Canal {channel_id}: Falha ao converter subscriberCount \'{subscriber_count_str}\' para int.")
                        pass
                current_app.logger.info(f"Canal {channel_id}: Contagem de inscritos (raw): {subscriber_count_str}, Oculta: {hidden_subscriber_count}, Contagem parseada: {subscriber_count}")

                if subscriber_count is None or subscriber_count >= max_subscribers:
                    current_app.logger.info(f"Canal {channel_id} REJEITADO: Contagem de inscritos ({subscriber_count}) é None ou >= max_subscribers ({max_subscribers}).")
                    continue
                current_app.logger.info(f"Canal {channel_id} APROVADO no filtro de inscritos.")

                total_video_count_str = statistics.get("videoCount")
                total_video_count = None
                if total_video_count_str is not None:
                    try:
                        total_video_count = int(total_video_count_str)
                    except (ValueError, TypeError):
                        # CORRIGIDO AQUI:
                        current_app.logger.warning(f"Canal {channel_id}: Falha ao converter videoCount \'{total_video_count_str}\' para int.")
                current_app.logger.info(f"Canal {channel_id}: Total de vídeos no canal (raw): {total_video_count_str}, Parseado: {total_video_count}")

                if total_video_count is not None and total_video_count > max_total_videos_in_channel:
                    current_app.logger.info(f"Canal {channel_id} REJEITADO: Total de vídeos ({total_video_count}) > max_total_videos_in_channel ({max_total_videos_in_channel}).")
                    continue
                current_app.logger.info(f"Canal {channel_id} APROVADO no filtro de total de vídeos no canal.")
                
                filtered_channels_info[channel_id] = {
                    "channelId": channel_id, 
                    "title": snippet.get("title"),
                    "subscriberCount": subscriber_count,
                    "channel_link": f"https://www.youtube.com/channel/{channel_id}"
                }
                current_app.logger.info(f"--- Canal ID: {channel_id} ADICIONADO aos filtrados ---")

        current_app.logger.info(f"{len(filtered_channels_info)} canais passaram nos filtros iniciais.")
        if not filtered_channels_info: return jsonify([])

        results = []
        processed_channel_count = 0
        current_app.logger.info(f"Iniciando busca de vídeos para {len(filtered_channels_info)} canais filtrados.")
        video_cutoff_date = datetime.now(timezone.utc) - timedelta(days=video_published_within_days)
        current_app.logger.info(f"Data de corte para vídeos ({video_published_within_days} dias atrás): {video_cutoff_date}")

        for channel_id, channel_info in filtered_channels_info.items():
            processed_channel_count += 1
            current_app.logger.info(f"Processando canal {processed_channel_count}/{len(filtered_channels_info)}: ID={channel_id}, Título=\"{channel_info['title']}\"")
            channel_videos = fetch_channel_videos_paginated(youtube, channel_id, max_videos_per_channel_to_analyze)
            current_app.logger.info(f"Canal {channel_id}: {len(channel_videos)} vídeos retornados por fetch_channel_videos_paginated.")
            
            for video in channel_videos:
                video_published_at_str = video.get("publishedAt")
                video_published_at = parse_iso_datetime(video_published_at_str)
                current_app.logger.info(f"Vídeo {video.get('videoId')} (Canal {channel_id}): Data de pub (raw): {video_published_at_str}, Data parseada: {video_published_at}")

                if not video_published_at or video_published_at < video_cutoff_date:
                    current_app.logger.info(f"Vídeo {video.get('videoId')} REJEITADO: Data de publicação ({video_published_at}) é anterior à data de corte ({video_cutoff_date}) ou inválida.")
                    continue
                current_app.logger.info(f"Vídeo {video.get('videoId')} APROVADO no filtro de data de publicação.")

                view_count = video.get("viewCount")
                current_app.logger.info(f"Vídeo {video.get('videoId')} (Canal {channel_id}): Views={view_count}, Filtro Min Views={min_video_views}")
                if view_count is not None and view_count >= min_video_views:
                    current_app.logger.info(f"Vídeo {video.get('videoId')} APROVADO no filtro de views.")
                    views_per_sub = calculate_views_per_subscriber(view_count, channel_info["subscriberCount"])
                    results.append({
                        "channelName": channel_info["title"],
                        "channelLink": channel_info["channel_link"],
                        "subscriberCount": channel_info["subscriberCount"],
                        "videoTitle": video.get("title"),
                        "videoLink": f"https://www.youtube.com/watch?v={video.get('videoId')}",
                        "publishedAt": video.get("publishedAt"),
                        "viewCount": view_count,
                        "viewsPerSubscriber": views_per_sub,
                        "keyword": keywords
                    })
                else:
                    current_app.logger.info(f"Vídeo {video.get('videoId')} REJEITADO no filtro de views (Views: {view_count}, Mínimo: {min_video_views}).")
        current_app.logger.info(f"Total de {len(results)} vídeos coletados que atendem a todos os critérios.")
        results.sort(key=lambda x: x["viewsPerSubscriber"], reverse=True)
        end_time = time.time()
        current_app.logger.info(f"find_niches concluído em {end_time - start_time:.2f} segundos. Retornando {len(results)} resultados.")
        return jsonify(results)
    except HttpError as e:
        return handle_api_error(e)
    except Exception as e:
        current_app.logger.error(f"Erro inesperado em find_niches: {e}", exc_info=True)
        return jsonify({"error": "Ocorreu um erro inesperado no servidor ao buscar nichos."}), 500

