import os

import requests


def avisar_slack(texto: str) -> None:
    """Envía un mensaje al canal de Slack si existe SLACK_WEBHOOK_URL. Si falla, no rompe la API."""
    url = os.getenv("SLACK_WEBHOOK_URL")
    if not url:
        return
    try:
        requests.post(url, json={"text": texto}, timeout=3)
    except requests.RequestException:
        pass
