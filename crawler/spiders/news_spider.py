import requests
from bs4 import BeautifulSoup
import json
import os
import random
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
]


def get_cookies(session, headers):
    url = "https://www.ettoday.net/news/news-list.htm"
    resp = session.get(url, headers=headers)
    resp.raise_for_status()
    cookies = session.cookies.get_dict()
    required = ["et_token", "et_client_country", "check_pc_mobile"]
    for key in required:
        if key in cookies:
            logger.debug("  %s = %s", key, cookies[key])
        else:
            logger.debug("  %s = (not found)", key)
    return cookies


def fetch_story(session, headers, href):
    """Fetch the story content from a news article page using div.story."""
    try:
        resp = session.get(href, headers=headers, timeout=15)
        resp.raise_for_status()
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")
        story_div = soup.find("div", class_="story")
        if not story_div:
            return ""
        paragraphs = story_div.find_all("p")
        if paragraphs:
            text = "\n".join(p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True))
        else:
            text = story_div.get_text("\n", strip=True)
        return text.replace("\u3000", " ").replace("\n", "")
    except Exception as e:
        logger.warning("Error fetching story from %s: %s", href, e)
        return ""


def fetch_news(session, headers, date_str, stop_time=None):
    url = "https://www.ettoday.net/show_roll.php"
    t_file = f"{date_str}.xml"
    offset = 1
    all_articles = []

    target_date_prefix = f"{date_str[:4]}/{date_str[4:6]}/{date_str[6:]}"

    if stop_time:
        stop_time = stop_time.replace(":", "")
        stop_time = f"{stop_time[:2]}:{stop_time[2:]}"
        cutoff_dt = datetime.strptime(f"{target_date_prefix} {stop_time}", "%Y/%m/%d %H:%M")
        logger.info("Will collect articles from %s down to %s", target_date_prefix, stop_time)
    else:
        cutoff_dt = None
        logger.info("Will collect all articles on %s", target_date_prefix)

    empty_pages = 0

    while True:
        data = {
            "offset": offset,
            "tPage": 3,
            "tFile": t_file,
            "tOt": 0,
            "tSi": 0,
            "tAr": 0,
        }
        resp = session.post(url, data=data, headers=headers)
        resp.raise_for_status()

        html = resp.text.strip()
        if not html:
            logger.info("Offset %d: empty response, done.", offset)
            break

        soup = BeautifulSoup(html, "html.parser")
        items = soup.find_all("h3")

        if not items:
            logger.info("Offset %d: no articles found, done.", offset)
            break

        stop = False
        page_added = 0
        for item in items:
            date_span = item.find("span", class_="date")
            tag_em = item.find("em")
            link_a = item.find("a")

            if not date_span or not link_a:
                continue

            article_date = date_span.get_text(strip=True)
            tag = tag_em.get_text(strip=True) if tag_em else ""
            href = link_a.get("href", "")
            title = link_a.get_text(strip=True).replace("\u3000", " ")

            if tag in ("政治", "社會", "房產雲", "大陸", "健康", "軍武", "ESG", "新奇", "網搜", "論壇", "法律", "公益"):
                continue

            try:
                article_dt = datetime.strptime(article_date, "%Y/%m/%d %H:%M")
            except ValueError:
                continue

            if not article_date.startswith(target_date_prefix):
                continue

            if cutoff_dt and article_dt < cutoff_dt:
                stop = True
                break

            page_added += 1
            all_articles.append(
                {
                    "date": article_date,
                    "tag": tag,
                    "href": href,
                    "title": title,
                }
            )

        logger.info("Offset %d: added %d articles (total: %d)", offset, page_added, len(all_articles))

        if stop:
            logger.info("Reached stop time %s, done.", stop_time)
            break

        if page_added == 0:
            empty_pages += 1
            if empty_pages >= 3:
                logger.info("3 consecutive pages with no matching articles, done.")
                break
        else:
            empty_pages = 0

        if len(items) < 10:
            logger.info("Less than 10 articles returned, done.")
            break

        offset += 1

    return all_articles


def fetch_all_stories(session, headers, articles):
    """Fetch story content for all articles."""
    total = len(articles)
    for i, article in enumerate(articles):
        href = article["href"]
        logger.info("[%d/%d] Fetching story: %s", i + 1, total, href)
        article["story"] = fetch_story(session, headers, href)
    return articles


def run(date_str=None, stop_time=None):
    """
    Run the ETtoday news scraper.

    Args:
        date_str: Date string in YYYYMMDD format. Defaults to today.
        stop_time: Optional stop time in HHMM format.

    Returns:
        list: List of article dicts with story content.
    """
    if not date_str:
        date_str = datetime.now().strftime("%Y%m%d")

    logger.info("Date: %s", date_str)
    if stop_time:
        logger.info("Stop time: %s", stop_time)

    ua = random.choice(USER_AGENTS)
    headers = {
        "User-Agent": ua,
        "Referer": "https://www.ettoday.net/news/news-list.htm",
    }

    session = requests.Session()

    logger.info("Step 1: Getting cookies...")
    get_cookies(session, headers)

    logger.info("Step 2: Fetching news list...")
    articles = fetch_news(session, headers, date_str, stop_time)

    logger.info("Step 3: Fetching story content for %d articles...", len(articles))
    articles = fetch_all_stories(session, headers, articles)

    formatted_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
    output_file = f"/app/data/ettoday_{formatted_date}.json"
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)

    stories_found = sum(1 for a in articles if a.get("story"))
    logger.info("Saved %d articles (%d with story) to %s", len(articles), stories_found, output_file)

    return articles
