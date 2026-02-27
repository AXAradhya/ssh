import heapq
from typing import Dict, Any, List

class SelfHealingGrid:
    """
    Self-Healing Grid Protocol.
    A graph-theory algorithm mapping substations. 
    If one substation 'fails', it instantly calculates the physical path of least resistance
    to route power from other zones.
    """
    def __init__(self):
        # Directed graph of substation connections: node -> {neighbor: capacity_available_mw}
        self.grid_graph = {
            "Substation-A": {"Substation-B": 50, "Substation-C": 120},
            "Substation-B": {"Substation-A": 50, "Substation-D": 80, "Substation-E": 30},
            "Substation-C": {"Substation-A": 120, "Substation-D": 100},
            "Substation-D": {"Substation-B": 80, "Substation-C": 100, "Substation-E": 60, "Substation-F": 150},
            "Substation-E": {"Substation-B": 30, "Substation-D": 60, "Substation-F": 90},
            "Substation-F": {"Substation-D": 150, "Substation-E": 90}
        }
        
    def calculate_reroute(self, failed_node: str, target_node: str, required_mw: float) -> Dict[str, Any]:
        """
        Calculates optimal reroute path if a node fails.
        Graph search (Dijkstra adaptation for maximum bottleneck capacity).
        """
        if failed_node not in self.grid_graph or target_node not in self.grid_graph:
            return {"status": "ERROR", "message": "Invalid node identifiers"}
            
        # We need to find a path from any power source to target_node 
        # that does NOT go through failed_node and has at least `required_mw` capacity.
        # For simulation, assume Substation-A is the primary main generation source.
        source_node = "Substation-A"
        
        if target_node == source_node or failed_node == source_node:
            return {"status": "CRITICAL_FAILURE", "message": "Source node compromised. Blackout imminent."}
            
        # Priority queue for modified Dijkstra (finding path with max minimum capacity)
        # Store (-capacity, current_node, path)
        pq = [(-float('inf'), source_node, [source_node])]
        
        # Max capacity path to each node seen so far
        max_cap_to = {node: 0 for node in self.grid_graph}
        max_cap_to[source_node] = float('inf')
        
        best_path = []
        bottleneck_mw = 0
        
        while pq:
            neg_cap, current, path = heapq.heappop(pq)
            current_cap = -neg_cap
            
            if current == target_node:
                best_path = path
                bottleneck_mw = current_cap
                break
                
            for neighbor, edge_cap in self.grid_graph[current].items():
                if neighbor == failed_node:
                    continue # Skip failed node
                    
                if neighbor in path:
                    continue # Prevent cycles
                    
                # The capacity of this path is the bottleneck (minimum) of all edges in the path
                path_cap = min(current_cap, edge_cap)
                
                if path_cap > max_cap_to[neighbor]:
                    max_cap_to[neighbor] = path_cap
                    heapq.heappush(pq, (-path_cap, neighbor, path + [neighbor]))
                    
        if not best_path:
            return {
                "status": "ISOLATED",
                "message": f"No alternate routes available to {target_node} bypassing {failed_node}.",
                "path_found": [],
                "capacity_available_mw": 0
            }
            
        if bottleneck_mw >= required_mw:
            status = "SUCCESS_FULL_CAPACITY"
        else:
            status = "PARTIAL_RECOVERY_BROWNOUT_REQUIRED"
            
        return {
            "status": status,
            "failed_node": failed_node,
            "target_node": target_node,
            "required_mw": required_mw,
            "path_found": best_path,
            "capacity_available_mw": bottleneck_mw,
            "hop_count": len(best_path) - 1
        }
