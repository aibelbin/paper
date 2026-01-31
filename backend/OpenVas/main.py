from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from gvm.connections import TLSConnection
from gvm.protocols.gmp import Gmp

GMP_HOST = "143.110.250.168"
GMP_PORT = 9390
GMP_USER = "admin"
GMP_PASS = "-34ef-4d46-b3e1-de8935d4b47e" 

app = FastAPI(title="OpenVAS API")


class OpenVasScanRequest(BaseModel):
    name: str
    target: str


def get_gmp():
    connection = TLSConnection(
        hostname=GMP_HOST,
        port=GMP_PORT,
        tls_verify=False  
    )
    gmp = Gmp(connection)
    gmp.authenticate(GMP_USER, GMP_PASS)
    return gmp


@app.post("/openVas/scans")
def create_scan(payload: OpenVasScanRequest):
    try:
        gmp = get_gmp()

        # 1. Create target
        target = gmp.create_target(
            name=f"target-{payload.name}",
            hosts=payload.target
        )
        target_id = target.get("id")

        # 2. Get "Full and fast" scan config
        configs = gmp.get_scan_configs()
        config_id = next(
            c.get("id")
            for c in configs.findall("scan_config")
            if c.findtext("name") == "Full and fast"
        )

        task = gmp.create_task(
            name=payload.name,
            target_id=target_id,
            config_id=config_id
        )
        task_id = task.get("id")

        gmp.start_task(task_id)
        gmp.disconnect()

        return {
            "status": "started",
            "task_id": task_id,
            "target": payload.target
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
