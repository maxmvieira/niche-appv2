# src/scheduler.py

from apscheduler.schedulers.background import BackgroundScheduler
from src.routes.youtube import calculate_trending_niches
import atexit

def init_scheduler(app):
    """Initializes and starts the background scheduler."""
    scheduler = BackgroundScheduler(daemon=True)
    # Schedule the job to run once a week (e.g., every Monday at 3 AM)
    # Use app.app_context() within the job if it needs access to app context
    scheduler.add_job(
        func=lambda: app.app_context().push() or calculate_trending_niches(), 
        trigger="cron", 
        day_of_week="mon", 
        hour=3, 
        minute=0
    )
    scheduler.start()
    print("Scheduler started. Task 'calculate_trending_niches' scheduled weekly.")

    # Shut down the scheduler when exiting the app
    atexit.register(lambda: scheduler.shutdown())

    return scheduler

