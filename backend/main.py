import os
import uuid
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

app = FastAPI(title="System Telemetry API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables are required")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# Pydantic models for request validation
class CPUMetrics(BaseModel):
    percent: float
    count: int
    count_logical: int
    frequency_mhz: Optional[float] = None

class MemoryMetrics(BaseModel):
    total_bytes: int
    available_bytes: int
    used_bytes: int
    percent: float
    swap_total_bytes: int
    swap_used_bytes: int
    swap_percent: float
    swap_in_bytes: Optional[int] = None
    swap_out_bytes: Optional[int] = None
    swap_in_bytes_per_sec: Optional[float] = None
    swap_out_bytes_per_sec: Optional[float] = None

class DiskPartition(BaseModel):
    device: str
    mountpoint: str
    fstype: str
    total_bytes: int
    used_bytes: int
    free_bytes: int
    percent: float

class DiskIO(BaseModel):
    read_bytes: int
    write_bytes: int
    read_count: int
    write_count: int
    read_bytes_per_sec: Optional[float] = None
    write_bytes_per_sec: Optional[float] = None

class DiskMetrics(BaseModel):
    partitions: list[DiskPartition]
    io: DiskIO

class NetworkMetrics(BaseModel):
    bytes_sent: int
    bytes_recv: int
    packets_sent: int
    packets_recv: int
    errors_in: int
    errors_out: int
    drops_in: int
    drops_out: int
    bytes_sent_per_sec: Optional[float] = None
    bytes_recv_per_sec: Optional[float] = None

class TelemetryPayload(BaseModel):
    timestamp: str
    hostname: str
    system: str
    system_id: str  # Unique identifier for the VPS
    cpu: CPUMetrics
    memory: MemoryMetrics
    disk: DiskMetrics
    network: NetworkMetrics


@app.get("/")
async def root():
    return {"status": "ok", "service": "System Telemetry API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/api/metrics")
async def receive_metrics(payload: TelemetryPayload):
    """
    Receive system metrics from client toolkit and store in Supabase.
    """
    try:
        telemetry_record = {
            "id": str(uuid.uuid4()),
            "created_at": datetime.utcnow().isoformat(),
            "system_id": payload.system_id,
            "hostname": payload.hostname,
            "system": payload.system,
            "cpu": payload.cpu.model_dump(),
            "memory": payload.memory.model_dump(),
            "disk": payload.disk.model_dump(),
            "network": payload.network.model_dump(),
        }
        
        result = supabase.table("system_telemetry").insert(telemetry_record).execute()
        print("Metrics stored successfully", result)
        
        return {
            "status": "success",
            "message": "Metrics stored successfully",
            "id": telemetry_record["id"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to store metrics: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
