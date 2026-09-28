#!/usr/bin/env python3
"""
Script independente para testar a execução do payload
"Habilitar Conta no MA Data Request" diretamente no TDM.

Uso:
    python test_habilitar_ma.py --token SEU_BEARER_TOKEN
    python test_habilitar_ma.py --user m627529 --password SENHA
    python test_habilitar_ma.py --token SEU_TOKEN --agencia 448 --conta 246173

Parâmetros opcionais:
    --agencia   Agência (default: 448)
    --conta     Conta (default: 246173)
    --url       TDM base URL (default: https://10.198.2.185:8443)
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import uuid
from datetime import datetime

import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

TDM_BASE_URL = "https://10.198.2.185:8443"
WORKFLOW_PROJETO_JIRA = "ENGPBIA-ENGENHARIA DE PLATAFORMA | BIA TECH"
WORKFLOW_EMAIL = "carlosandre.moitas@bradesco.com.br"


def tdm_login(base_url: str, username: str, password: str) -> str:
    url = f"{base_url}/TestDataManager/user/login"
    response = requests.post(
        url,
        headers={"Accept": "application/json"},
        auth=(username, password),
        verify=False,
        timeout=60,
    )
    if response.status_code in (401, 403):
        raise RuntimeError("Usuário ou senha do TDM inválidos.")
    if response.status_code < 200 or response.status_code >= 300:
        raise RuntimeError(f"Falha no login (HTTP {response.status_code}): {response.text}")
    token = response.json().get("token")
    if not token:
        raise RuntimeError("Login não retornou token.")
    return token


def make_headers(token: str) -> dict:
    return {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
        "x-correlation-id": str(uuid.uuid4()),
    }


def submit_payload(base_url: str, token: str, payload: dict) -> int:
    url = f"{base_url}/TDMDataFlowService/api/ca/v1/requests"
    response = requests.post(
        url,
        headers={
            **make_headers(token),
            "Content-Type": "application/json",
            "Origin": base_url,
            "Referer": f"{base_url}/",
            "X-Requested-With": "tdm-test-script",
        },
        json=payload,
        verify=False,
        timeout=120,
    )
    if response.status_code < 200 or response.status_code >= 300:
        raise RuntimeError(f"Submit falhou (HTTP {response.status_code}): {response.text}")
    data = response.json()
    job_id = data.get("jobId") or data.get("id") or (data.get("data") or {}).get("jobId")
    if not job_id:
        raise RuntimeError(f"TDM não retornou jobId: {json.dumps(data, indent=2)}")
    print(f"  → Job submetido: {job_id}")
    return int(job_id)


def get_job(base_url: str, token: str, job_id: int) -> dict:
    url = f"{base_url}/TDMJobService/api/ca/v1/jobs/{job_id}"
    response = requests.get(url, headers=make_headers(token), verify=False, timeout=60)
    if response.status_code < 200 or response.status_code >= 300:
        raise RuntimeError(f"Erro ao consultar job {job_id} (HTTP {response.status_code})")
    return response.json()


def wait_for_job(base_url: str, token: str, job_id: int, max_attempts: int = 36, delay: int = 5) -> dict:
    terminal = {"completed", "failed", "cancelled", "canceled"}
    for attempt in range(1, max_attempts + 1):
        job = get_job(base_url, token, job_id)
        status = str(job.get("status") or "").strip().lower()
        print(f"  → Tentativa {attempt}/{max_attempts}: status={status}")
        if status == "completed":
            return job
        if status in terminal - {"completed"}:
            raise RuntimeError(f"Job {job_id} terminou com status: {status}")
        if attempt < max_attempts:
            time.sleep(delay)
    raise RuntimeError(f"Timeout aguardando job {job_id} (após {max_attempts} tentativas)")


def build_payload(agencia: str, conta: str, username: str) -> dict:
    now = datetime.utcnow()
    now_iso = now.isoformat(timespec="milliseconds") + "Z"
    now_millis = int(time.time() * 1000)
    return {
        "jobPubParams": {
            "scheduledDateTimeInMillisec": now_iso,
            "almjobs": [],
            "rallyJobs": [],
            "jobParams": [],
            "publishJobs": [
                {
                    "batchEngineThread": "ANY",
                    "dataSourceProfile": "",
                    "dataTargetProfile": "",
                    "description": "",
                    "jobTitle": "Group Job",
                    "levelID": 4593,
                    "publishVariables": [
                        {"name": "P_AGENCIA_MA", "preResolveError": "", "preResolveValue": "", "value": agencia},
                        {"name": "P_CONTA_MA", "preResolveError": "", "preResolveValue": "", "value": conta},
                        {"name": "p_projeto_jira", "preResolveError": "", "preResolveValue": "", "value": WORKFLOW_PROJETO_JIRA},
                    ],
                    "seq": 1,
                    "vtfnodeDesc": "Habilitar MA NOVO TI",
                    "vtfnodeID": "540",
                    "vtfnodeName": "Habilitar MA NOVO TI",
                    "iterations": 1,
                    "csvDelimiter": None,
                    "csvQuotationMarks": None,
                    "configurationId": 3032,
                }
            ],
            "testMatches": [],
            "exportJobs": [],
            "scheduledDt": now_iso,
            "selfServiceEmailMandate": False,
            "email": WORKFLOW_EMAIL,
            "globalThreadName": "ANY",
            "scheduledDateTimeInMillis": now_millis,
            "currentDay": now.day,
            "currentMonth": now.month,
            "currentYear": now.year,
            "globalSourceConnection": "",
            "globalTargetConnection": "",
            "jobSubmissionOrder": "0",
            "jobTitle": "Habilitar Conta no MA Data Request",
            "username": username,
        },
        "dataDesign": {"projectID": 3862, "versionID": 3863},
        "advancedToggleFlag": True,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Testa o payload Habilitar MA direto no TDM")
    parser.add_argument("--url", default=TDM_BASE_URL, help="TDM base URL")
    parser.add_argument("--token", default="", help="Bearer token do TDM")
    parser.add_argument("--user", default="", help="Usuário do TDM")
    parser.add_argument("--password", default="", help="Senha do TDM")
    parser.add_argument("--agencia", default="448", help="Agência (default: 448)")
    parser.add_argument("--conta", default="246173", help="Conta (default: 246173)")
    parser.add_argument("--username", default="m627529", help="Username no payload")
    args = parser.parse_args()

    base_url = args.url.rstrip("/")
    token = args.token

    print(f"\n=== Teste: Habilitar Conta no MA ===")
    print(f"  TDM URL : {base_url}")
    print(f"  Agência : {args.agencia}")
    print(f"  Conta   : {args.conta}")

    # Autenticação
    if not token:
        if not args.user or not args.password:
            print("\nERRO: forneça --token ou --user + --password")
            parser.print_help()
            return 1
        print("\n[1/3] Autenticando no TDM...")
        token = tdm_login(base_url, args.user, args.password)
        print("  → Token obtido com sucesso.")
    else:
        print(f"\n[1/3] Usando bearer token fornecido: {token[:20]}...")

    # Monta payload
    payload = build_payload(args.agencia, args.conta, args.username)
    print(f"\n[2/3] Payload gerado:")
    print(json.dumps(payload, indent=2, ensure_ascii=False))

    # Submit + polling
    print(f"\n[3/3] Submetendo e aguardando conclusão...")
    try:
        job_id = submit_payload(base_url, token, payload)
        job = wait_for_job(base_url, token, job_id)

        print(f"\n✓ Job {job_id} concluído com status: {job.get('status')}")
        print(f"\n=== Resultado ===")
        print(json.dumps({
            "jobId": job_id,
            "status": job.get("status"),
            "childJobs": [
                {"jobId": c.get("jobId"), "status": c.get("status"), "type": c.get("type")}
                for c in (job.get("jobs") or [])
            ],
        }, indent=2))
        return 0
    except Exception as exc:
        print(f"\n✗ Falha: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
