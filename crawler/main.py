import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from spiders import news_analyzer
from spiders.weather_spider import WeatherSpider
from spiders.beverage_spider import run_beverage_pipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger(__name__)


async def run_news_pipeline():
    """Run Gemini Google Search to find trending topics."""
    logger.info("=== Starting news trends pipeline ===")

    try:
        await news_analyzer.run()
        logger.info("News trends pipeline complete")
    except Exception:
        logger.exception("News trends pipeline failed")


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
