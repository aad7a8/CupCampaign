import asyncio
import logging
from datetime import datetime
from threading import Event

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from spiders import news_spider, news_analyzer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger(__name__)


def run_news_pipeline():
    """Run news scrape then analyze (sequential)."""
    date_str = datetime.now().strftime("%Y%m%d")
    formatted_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"

    logger.info("=== Starting news pipeline for %s ===", formatted_date)

    # Step 1: Scrape news
    try:
        articles = news_spider.run(date_str=date_str)
        logger.info("News scrape complete: %d articles", len(articles))
    except Exception:
        logger.exception("News scrape failed")
        return

    if not articles:
        logger.warning("No articles scraped, skipping analysis")
        return

    # Step 2: Analyze news
    input_file = f"/app/data/ettoday_{formatted_date}.json"
    try:
        result = asyncio.run(news_analyzer.run(input_file))
        if result:
            logger.info(
                "News analysis complete: %d qualified articles",
                result["stats"]["qualified"],
            )
    except Exception:
        logger.exception("News analysis failed")


def run_all():
    """Run all spiders."""
    run_news_pipeline()


def main():
    logger.info("Crawler service starting...")

    # Run once immediately on startup
    run_all()

    # Schedule daily runs
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        run_all,
        trigger=IntervalTrigger(days=1),
        id="daily_crawl",
        name="Daily crawl job",
    )
    scheduler.start()
    logger.info("Scheduler started, next run in 24 hours")

    # Keep process alive
    Event().wait()


if __name__ == "__main__":
    main()
