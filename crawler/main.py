import asyncio
import logging
from datetime import datetime, timedelta
from functools import partial

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from spiders import news_spider, news_analyzer
from spiders.weather_spider import WeatherSpider
from spiders.beverage_spider import run_beverage_pipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger(__name__)


async def run_news_pipeline():
    """Run news scrape then analyze (sequential)."""
    date_str = (datetime.now() - timedelta(days=1)).strftime("%Y%m%d")
    formatted_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"

    logger.info("=== Starting news pipeline for %s ===", formatted_date)

    # Step 1: Scrape news (blocking I/O → run in thread)
    try:
        articles = await asyncio.to_thread(news_spider.run, date_str=date_str)
        logger.info("News scrape complete: %d articles", len(articles))
    except Exception:
        logger.exception("News scrape failed")
        return

    if not articles:
        logger.warning("No articles scraped, skipping analysis")
        return

    # Step 2: Analyze news (already async)
    input_file = f"/app/data/ettoday_{formatted_date}.json"
    try:
        result = await news_analyzer.run(input_file)
        if result:
            logger.info(
                "News analysis complete: %d groups (%d passed filter)",
                result["stats"]["num_groups"],
                result["stats"]["passed_filter"],
            )
    except Exception:
        logger.exception("News analysis failed")


async def run_weather_pipeline():
    """Run weather forecast scrape and update."""
    logger.info("=== Starting weather pipeline ===")
    try:
        weather_spider = WeatherSpider()
        await asyncio.to_thread(weather_spider.run)
        logger.info("Weather pipeline complete")
    except Exception:
        logger.exception("Weather pipeline failed")


async def run_beverage_task():
    """Run beverage menu scrape and update."""
    logger.info("=== Starting beverage pipeline ===")
    try:
        await asyncio.to_thread(run_beverage_pipeline)
        logger.info("Beverage pipeline complete")
    except Exception:
        logger.exception("Beverage pipeline failed")


async def run_all():
    """Run all spiders concurrently."""
    await asyncio.gather(
        run_weather_pipeline(),
        run_beverage_task(),
        run_news_pipeline(),
    )


async def main():
    logger.info("Crawler service starting...")

    # 1. 啟動時立刻跑一次 (Run once immediately on startup)
    await run_all()

    # 2. 設定每天凌晨 3 點的排程 (Schedule daily runs at 3 AM)
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        run_all,
        trigger=CronTrigger(hour=3, minute=0),
        id="daily_crawl",
        name="Daily crawl job",
    )
    scheduler.start()
    logger.info("Scheduler started, scheduled to run daily at 03:00")

    # Keep process alive
    await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main())
