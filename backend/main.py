import os
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from Wazuh import WazuhSDK

# Import federated learning components
from federatedServer import (
    Config as FederatedConfig,
    NodeRegistry,
    FedAvgEngine,
    AnomalyDetector,
    VectorMath,
    ClientUpdate,
    NodeInfo,
    ComparisonResult,
    OutlierInfo,
    ClusterStats,
    logger as federated_logger
)

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

# if not SUPABASE_URL or not SUPABASE_KEY:
#     raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables are required")

# supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

wazuh = WazuhSDK(
    host="143.110.250.168",
    api_username="wazuh",
    api_password="XF59yHeRxf.CPK..G1yVHMhm6ZPeAtUA",
    indexer_username="admin",
    indexer_password="Peper-123900",
)

# Initialize federated learning components
registry = NodeRegistry()
fedavg_engine = FedAvgEngine()
anomaly_detector = AnomalyDetector(registry)


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


# =============================================================================
# TELEMETRY ENDPOINTS
# =============================================================================

@app.get("/")
async def root():
    return {"status": "ok", "service": "System Telemetry API"}


@app.get("/health")
async def health_check():
    import time
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "nodes_registered": len(registry.nodes),
        "nodes_active": len(registry.get_active_nodes())
    }


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


# =============================================================================
# FEDERATED LEARNING ENDPOINTS
# =============================================================================

@app.post("/federated/update")
async def receive_federated_update(update: ClientUpdate):
    """
    Receive a federated update from a client.
    Returns aggregated weights if available.
    """
    import time
    try:
        # Register or update the node
        node = registry.register_or_update(update)
        
        federated_logger.info(
            f"Update from {update.client_id}: "
            f"samples={update.num_samples}, update_count={update.update_count}"
        )
        
        # Compute FedAvg if we have enough nodes
        all_weights = registry.get_all_weights(active_only=True)
        aggregated = fedavg_engine.compute_average(all_weights)
        
        # Compute outlier score for this node
        outlier_scores = anomaly_detector.compute_outlier_scores()
        node_outlier = outlier_scores.get(update.client_id)
        
        response = {
            "status": "ok",
            "timestamp": time.time(),
            "cluster_size": len(registry.get_active_nodes())
        }
        
        if aggregated:
            response["aggregated_weights"] = aggregated
        
        if node_outlier:
            response["outlier_score"] = node_outlier.outlier_score
            response["is_outlier"] = node_outlier.is_outlier
        
        return response
        
    except Exception as e:
        federated_logger.error(f"Error processing update: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/nodes", response_model=List[NodeInfo])
async def list_nodes():
    """List all registered nodes."""
    nodes = registry.get_all_nodes()
    outlier_scores = anomaly_detector.compute_outlier_scores()
    
    result = []
    for node in nodes:
        outlier_info = outlier_scores.get(node.client_id)
        result.append(NodeInfo(
            client_id=node.client_id,
            last_seen=node.last_seen,
            last_seen_human=datetime.fromtimestamp(node.last_seen).isoformat(),
            embedding=node.embedding,
            num_samples=node.num_samples,
            update_count=node.update_count,
            is_stale=node.is_stale(),
            outlier_score=outlier_info.outlier_score if outlier_info else None
        ))
    
    return result


@app.get("/nodes/{client_id}", response_model=NodeInfo)
async def get_node(client_id: str):
    """Get details for a specific node."""
    node = registry.get_node(client_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    outlier_scores = anomaly_detector.compute_outlier_scores()
    outlier_info = outlier_scores.get(client_id)
    
    return NodeInfo(
        client_id=node.client_id,
        last_seen=node.last_seen,
        last_seen_human=datetime.fromtimestamp(node.last_seen).isoformat(),
        embedding=node.embedding,
        num_samples=node.num_samples,
        update_count=node.update_count,
        is_stale=node.is_stale(),
        outlier_score=outlier_info.outlier_score if outlier_info else None
    )


@app.get("/nodes/{client_id}/history")
async def get_node_history(client_id: str):
    """Get embedding history for a node."""
    node = registry.get_node(client_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    return {
        "client_id": client_id,
        "history_length": len(node.embedding_history),
        "history": node.embedding_history
    }


@app.get("/compare/{id1}/{id2}", response_model=ComparisonResult)
async def compare_nodes(id1: str, id2: str):
    """Compare two nodes by their embeddings."""
    node1 = registry.get_node(id1)
    node2 = registry.get_node(id2)
    
    if not node1:
        raise HTTPException(status_code=404, detail=f"Node {id1} not found")
    if not node2:
        raise HTTPException(status_code=404, detail=f"Node {id2} not found")
    
    cosine_sim = VectorMath.cosine_similarity(node1.embedding, node2.embedding)
    cosine_dist = VectorMath.cosine_distance(node1.embedding, node2.embedding)
    euclidean_dist = VectorMath.euclidean_distance(node1.embedding, node2.embedding)
    
    # Interpret the similarity
    if cosine_sim > 0.95:
        interpretation = "Nearly identical behavior"
    elif cosine_sim > 0.8:
        interpretation = "Very similar behavior"
    elif cosine_sim > 0.5:
        interpretation = "Somewhat similar behavior"
    elif cosine_sim > 0.2:
        interpretation = "Different behavior"
    else:
        interpretation = "Very different behavior - investigate!"
    
    return ComparisonResult(
        node_a=id1,
        node_b=id2,
        cosine_similarity=cosine_sim,
        cosine_distance=cosine_dist,
        euclidean_distance=euclidean_dist,
        interpretation=interpretation
    )


@app.get("/outliers", response_model=List[OutlierInfo])
async def get_outliers():
    """Get list of nodes flagged as behavioral outliers."""
    return anomaly_detector.get_outliers()


@app.get("/cluster", response_model=ClusterStats)
async def get_cluster_stats():
    """Get overall cluster statistics."""
    all_nodes = registry.get_all_nodes()
    active_nodes = registry.get_active_nodes()
    embeddings = registry.get_all_embeddings(active_only=True)
    
    # Compute centroid
    centroid = VectorMath.centroid(embeddings) if embeddings else []
    
    # Compute average distance from centroid
    if centroid and embeddings:
        distances = [
            VectorMath.euclidean_distance(emb, centroid) 
            for emb in embeddings
        ]
        avg_distance = sum(distances) / len(distances)
    else:
        avg_distance = 0.0
    
    # Count outliers
    outliers = anomaly_detector.get_outliers()
    
    # Total samples across all nodes
    total_samples = sum(n.num_samples for n in active_nodes)
    
    return ClusterStats(
        total_nodes=len(all_nodes),
        active_nodes=len(active_nodes),
        stale_nodes=len(all_nodes) - len(active_nodes),
        total_samples=total_samples,
        centroid=centroid,
        avg_distance_from_centroid=avg_distance,
        outlier_count=len(outliers)
    )

@app.get("/get/vulnerabilities")
async def get_vulnerabilities():
    vulnerabilities = wazuh.get_all_vulnerabilities(severity_filter=["Critical", "High", "Medium", "Low"])
    return vulnerabilities

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
