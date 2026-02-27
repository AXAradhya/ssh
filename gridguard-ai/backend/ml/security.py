import random
from typing import Dict, Any, List
from datetime import datetime

class GridIDS:
    """
    Intrusion Detection System (IDS) for Grid SCADA Networks.
    Simulates ML-based anomaly detection on incoming control requests.
    """
    def __init__(self):
        self.baseline_traffic_rate = 500  # requests per second
        
    def analyze_traffic(self, current_traffic_rate: float, failed_auth_attempts: int, foreign_ips_detected: int) -> Dict[str, Any]:
        """
        Analyze network traffic metadata for potential cyber threats.
        """
        threat_score = 0.0
        alerts = []
        
        # Traffic Volume Anomaly (DDoS Detection)
        traffic_ratio = current_traffic_rate / self.baseline_traffic_rate
        if traffic_ratio > 3.0:
            threat_score += 45.0
            alerts.append(f"Volumetric anomaly detected: {current_traffic_rate} req/s (+{(traffic_ratio-1)*100:.0f}% over baseline)")
        elif traffic_ratio > 1.5:
            threat_score += 15.0
            alerts.append(f"Elevated traffic volume: {current_traffic_rate} req/s")
            
        # Authentication Anomalies (Brute Force Detection)
        if failed_auth_attempts > 50:
            threat_score += 35.0
            alerts.append(f"High volume of failed SCADA authentication attempts ({failed_auth_attempts}). Possible brute-force.")
        elif failed_auth_attempts > 10:
            threat_score += 10.0
            
        # Foreign IP Geography (Unauthorized Access Detection)
        if foreign_ips_detected > 0:
            threat_score += 25.0 * foreign_ips_detected
            alerts.append(f"Connections from {foreign_ips_detected} unauthorized geographical IP block(s) intercepted.")
            
        # Normalize threat score
        threat_score = min(100.0, threat_score)
        
        # Add random noise for ML 'fuzziness'
        if threat_score < 100:
            threat_score += random.uniform(0.0, 5.0)
            threat_score = min(100.0, threat_score)
            
        # Determine Status
        status = "SECURE"
        if threat_score >= 80:
            status = "CRITICAL BREACH ATTEMPT"
        elif threat_score >= 50:
            status = "ELEVATED THREAT"
        elif threat_score >= 20:
            status = "SUSPICIOUS ACTIVITY"
            
        return {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "threat_score": round(threat_score, 1),
            "status": status,
            "active_alerts": alerts,
            "metrics": {
                "traffic_req_sec": current_traffic_rate,
                "failed_logins": failed_auth_attempts,
                "foreign_ips": foreign_ips_detected
            }
        }
