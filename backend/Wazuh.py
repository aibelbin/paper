import requests
import urllib3
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from requests.auth import HTTPBasicAuth

# Disable SSL warnings for self-signed certificates (common in Wazuh setups)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


@dataclass
class Vulnerability:
    """Represents a vulnerability entry"""
    cve_id: str
    cve_score: str
    package_name: str
    package_description: str
    package_version: str
    severity: str
    description: str
    reference: str
    published_at: str
    detected_at: str
    host: str
    agent_id: str
    agent_name: str
    
    def to_dict(self) -> Dict[str, str]:
        return {
            "cve_id": self.cve_id,
            "cve_score": self.cve_score,
            "package_name": self.package_name,
            "package_description": self.package_description,
            "package_version": self.package_version,
            "severity": self.severity,
            "description": self.description,
            "reference": self.reference,
            "published_at": self.published_at,
            "detected_at": self.detected_at,
            "host": self.host,
            "agent_id": self.agent_id,
            "agent_name": self.agent_name
        }


class WazuhAPIError(Exception):
    """Custom exception for Wazuh API errors"""
    def __init__(self, message: str, status_code: int = None):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class WazuhSDK:
    """
    Wazuh API SDK for vulnerability management
    """
    
    def __init__(
        self,
        host: str,
        api_username: str,
        api_password: str,
        indexer_username: str,
        indexer_password: str,
        verify_ssl: bool = False,
        timeout: int = 30
    ):
        self.host = host
        self.api_username = api_username
        self.api_password = api_password
        self.indexer_username = indexer_username
        self.indexer_password = indexer_password
        self.verify_ssl = verify_ssl
        self.timeout = timeout
        self.token: Optional[str] = None
        self._session = requests.Session()
    
    def _get_token(self) -> str:
        """Authenticate and get JWT token from Wazuh API"""
        url = f"https://{self.host}:55000/security/user/authenticate"
        
        response = self._session.post(
            url,
            auth=HTTPBasicAuth(self.api_username, self.api_password),
            verify=self.verify_ssl,
            timeout=self.timeout
        )
        
        if response.status_code != 200:
            raise WazuhAPIError(
                f"Authentication failed: {response.text}",
                response.status_code
            )
        
        data = response.json()
        self.token = data.get("data", {}).get("token")
        
        if not self.token:
            raise WazuhAPIError("Failed to retrieve token from response")
        
        return self.token
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers with authorization token"""
        if not self.token:
            self._get_token()
        
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def _make_api_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        data: Optional[Dict] = None,
        retry_auth: bool = True
    ) -> Dict[str, Any]:
        """Make an authenticated API request (Port 55000)"""
        url = f"https://{self.host}:55000{endpoint}"
        
        try:
            response = self._session.request(
                method=method,
                url=url,
                headers=self._get_headers(),
                params=params,
                json=data,
                verify=self.verify_ssl,
                timeout=self.timeout
            )
            
            # Handle token expiration
            if response.status_code == 401 and retry_auth:
                self.token = None
                return self._make_api_request(method, endpoint, params, data, retry_auth=False)
            
            if response.status_code not in [200, 201]:
                raise WazuhAPIError(
                    f"API request failed: {response.text}",
                    response.status_code
                )
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            raise WazuhAPIError(f"Request failed: {str(e)}")

    def _make_indexer_request(
        self,
        endpoint: str,
        data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make an authenticated indexer request (Port 9200)"""
        url = f"https://{self.host}:9200{endpoint}"
        
        try:
            response = self._session.request(
                method="GET",
                url=url,
                auth=HTTPBasicAuth(self.indexer_username, self.indexer_password),
                headers={"Content-Type": "application/json"},
                json=data,
                verify=self.verify_ssl,
                timeout=self.timeout
            )
            
            if response.status_code not in [200, 201]:
                # ElasticSearch might return errors with valid JSON
                raise WazuhAPIError(
                    f"Indexer request failed: {response.text}",
                    response.status_code
                )
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            raise WazuhAPIError(f"Request failed: {str(e)}")
    
    def get_agents(self) -> List[Dict[str, Any]]:
        """Get list of all agents"""
        response = self._make_api_request("GET", "/agents", params={"limit": 100000})
        return response.get("data", {}).get("affected_items", [])
    
    def get_agent_vulnerabilities(
        self,
        agent_id: str,
        limit: int = 1,
        offset: int = 0,
        severity_filter: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Get vulnerabilities for a specific agent from Wazuh Indexer
        """
        data = {
            # "query": {
            #     "match": {
            #         "agent.id": agent_id
            #     }
            # },
            "query": {
                "bool": {
                    "must": [{ "match": { "agent.id": agent_id } }],
                    "filter": [{ "terms": { "vulnerability.severity": severity_filter or [] } }]
                }
            },
            "sort": [
                { "vulnerability.score.base": { "order": "desc" } }
            ],
            "size": limit,
            "from": offset
        }
        
        return self._make_indexer_request(
            endpoint="/wazuh-states-vulnerabilities-*/_search",
            data=data
        )
    
    def get_all_agent_vulnerabilities(self, agent_id: str, severity_filter: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Get all vulnerabilities for a specific agent (handles pagination)
        """
        all_vulnerabilities = []
        offset = 0
        limit = 10
        
        while True:
            response = self.get_agent_vulnerabilities(agent_id, limit=limit, offset=offset, severity_filter=severity_filter)
            # Indexer returns: hits.hits (list of docs)
            hits = response.get("hits", {}).get("hits", [])
            total = response.get("hits", {}).get("total", {}).get("value", 0)
            # We need to extract the _source from hits
            items = [hit["_source"] for hit in hits]
            all_vulnerabilities.extend(items)
            if len(all_vulnerabilities) >= total or len(items) == 0:
                break
            
            if offset >= 100:
                break
            offset += limit

        return all_vulnerabilities
    
    def get_all_vulnerabilities(
        self,
        severity_filter: Optional[List[str]] = None
    ) -> List[Vulnerability]:
        """
        Get all vulnerabilities from all agents
        """
        vulnerabilities = []
        agents = self.get_agents()
        
        for agent in agents:
            agent_id = agent.get("id")
            agent_name = agent.get("name", "Unknown")
            
            # Skip manager (agent 000) if needed
            if agent_id == "000":
                continue
            
            try:
                agent_vulns = self.get_all_agent_vulnerabilities(agent_id, severity_filter=severity_filter)

                for vuln in agent_vulns:
                    vulnerability = Vulnerability(
                        cve_id=vuln.get("vulnerability", "N/A").get("id", "N/A"),
                        cve_score=vuln.get("vulnerability", "N/A").get("score", "N/A").get("base", "N/A"),
                        package_name=vuln.get("package", "N/A").get("name", "N/A"),
                        package_description=vuln.get("package", "N/A").get("description", "N/A"),
                        package_version=vuln.get("package", "N/A").get("version", "N/A"),
                        severity=vuln.get("vulnerability", "N/A").get("severity", "Unknown"),
                        description=vuln.get("vulnerability", "N/A").get("description", "No description available"),
                        reference=vuln.get("vulnerability", "N/A").get("reference", "N/A"),
                        published_at=vuln.get("vulnerability", "N/A").get("published_at", "N/A"),
                        detected_at=vuln.get("vulnerability", "N/A").get("detected_at", "N/A"),
                        host=vuln.get("host", "N/A").get("os", "N/A").get("name", "N/A"),
                        agent_id=agent_id,
                        agent_name=agent_name
                    )
                    vulnerabilities.append(vulnerability.to_dict())

            except WazuhAPIError as e:
                print(f"Warning: Failed to get vulnerabilities for agent {agent_id}: {e}")
                continue

        return vulnerabilities
    
    def get_vulnerabilities_summary(self) -> Dict[str, Any]:
        """
        Get a summary of vulnerabilities grouped by severity
        """
        vulnerabilities = self.get_all_vulnerabilities()
        
        summary = {
            "total": len(vulnerabilities),
            "by_severity": {},
            "by_agent": {}
        }
        
        for vuln in vulnerabilities:
            # Count by severity
            severity = vuln.severity
            summary["by_severity"][severity] = summary["by_severity"].get(severity, 0) + 1
            
            # Count by agent
            agent_key = f"{vuln.agent_id} ({vuln.agent_name})"
            summary["by_agent"][agent_key] = summary["by_agent"].get(agent_key, 0) + 1
        
        return summary
    
    def export_vulnerabilities_to_csv(
        self,
        filepath: str,
        severity_filter: Optional[List[str]] = None
    ) -> int:
        """
        Export vulnerabilities to a CSV file
        """
        import csv
        
        vulnerabilities = self.get_all_vulnerabilities(severity_filter)
        
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = [
                'vulnerability_id', 'package_name', 'package_description',
                'package_version', 'severity', 'description', 'reference',
                'published_at', 'detected_at', 'host', 'agent_id', 'agent_name'
            ]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for vuln in vulnerabilities:
                writer.writerow(vuln.to_dict())
        
        return len(vulnerabilities)
