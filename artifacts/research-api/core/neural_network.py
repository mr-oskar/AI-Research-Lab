"""Neural Network model - the live graph that agents can mutate"""

import math
import random
import uuid
from typing import Any, Dict, List


class NeuralNetwork:
    def __init__(self):
        self.nodes: List[Dict] = []
        self.edges: List[Dict] = []
        self._initialize_default()

    def _initialize_default(self):
        """Build a small default network topology"""
        layers = [
            ("input", 3),
            ("hidden", 4),
            ("attention", 2),
            ("memory", 2),
            ("hidden", 3),
            ("output", 2),
        ]
        node_ids_by_layer: List[List[str]] = []
        layer_x = [100, 250, 380, 380, 510, 660]

        for li, (ntype, count) in enumerate(layers):
            ids = []
            for i in range(count):
                nid = str(uuid.uuid4())[:8]
                y_offset = (i - (count - 1) / 2) * 80 + 250
                self.nodes.append({
                    "id": nid,
                    "label": f"{ntype[0].upper()}{li}{i}",
                    "type": ntype,
                    "x": layer_x[li],
                    "y": y_offset,
                    "activation": random.uniform(0.1, 0.9),
                    "connections": 0,
                })
                ids.append(nid)
            node_ids_by_layer.append(ids)

        for li in range(len(node_ids_by_layer) - 1):
            for src in node_ids_by_layer[li]:
                for tgt in node_ids_by_layer[li + 1]:
                    if random.random() > 0.3:
                        self._add_edge(src, tgt, random.uniform(-1, 1))

        self._update_connection_counts()

    def _add_edge(self, source: str, target: str, weight: float):
        eid = str(uuid.uuid4())[:8]
        self.edges.append({
            "id": eid,
            "source": source,
            "target": target,
            "weight": weight,
            "active": True,
        })

    def _update_connection_counts(self):
        counts: Dict[str, int] = {n["id"]: 0 for n in self.nodes}
        for e in self.edges:
            if e["source"] in counts:
                counts[e["source"]] += 1
            if e["target"] in counts:
                counts[e["target"]] += 1
        for n in self.nodes:
            n["connections"] = counts.get(n["id"], 0)

    def add_node(self, node_type: str = "hidden") -> Dict:
        nid = str(uuid.uuid4())[:8]
        type_x = {
            "input": 100, "hidden": 380, "attention": 380,
            "memory": 380, "output": 660,
        }
        node = {
            "id": nid,
            "label": f"{node_type[0].upper()}{len(self.nodes)}",
            "type": node_type,
            "x": type_x.get(node_type, 380) + random.randint(-40, 40),
            "y": random.randint(100, 400),
            "activation": random.uniform(0.1, 0.9),
            "connections": 0,
        }
        self.nodes.append(node)
        hidden_nodes = [n for n in self.nodes if n["type"] == "hidden" and n["id"] != nid]
        if hidden_nodes:
            target = random.choice(hidden_nodes)
            self._add_edge(nid, target["id"], random.uniform(-0.5, 0.5))
        self._update_connection_counts()
        return node

    def remove_node(self, node_id: str):
        self.nodes = [n for n in self.nodes if n["id"] != node_id]
        self.edges = [
            e for e in self.edges
            if e["source"] != node_id and e["target"] != node_id
        ]
        self._update_connection_counts()

    def mutate(self, action: Dict) -> Dict:
        act = action.get("action", "")
        if act == "add_node":
            node_type = action.get("nodeType", "hidden")
            self.add_node(node_type)
        elif act == "remove_node":
            node_id = action.get("nodeId")
            if node_id:
                self.remove_node(node_id)
        elif act == "add_edge":
            src = action.get("sourceId")
            tgt = action.get("targetId")
            weight = action.get("weight", random.uniform(-1, 1))
            if src and tgt:
                self._add_edge(src, tgt, weight)
        elif act == "remove_edge":
            edge_id = action.get("edgeId")
            if edge_id:
                self.edges = [e for e in self.edges if e["id"] != edge_id]
        elif act == "modify_weight":
            edge_id = action.get("edgeId")
            weight = action.get("weight", 0.0)
            for e in self.edges:
                if e["id"] == edge_id:
                    e["weight"] = weight
                    break
        self._update_connection_counts()
        return self.to_dict()

    def evolve(self, performance_score: float):
        """Slightly evolve the network based on performance — called each iteration"""
        for node in self.nodes:
            delta = (random.random() - 0.5) * 0.1 * (1 - performance_score)
            node["activation"] = max(0.01, min(0.99, node["activation"] + delta))
        if random.random() < 0.08:
            for edge in self.edges:
                edge["weight"] += (random.random() - 0.5) * 0.05
                edge["weight"] = max(-1, min(1, edge["weight"]))
        if random.random() < 0.05 and len(self.nodes) < 25:
            self.add_node(random.choice(["hidden", "attention", "memory"]))
        if random.random() < 0.03 and len(self.edges) > 5:
            idx = random.randrange(len(self.edges))
            self.edges[idx]["active"] = not self.edges[idx]["active"]

    def to_dict(self) -> Dict:
        return {
            "nodes": self.nodes,
            "edges": self.edges,
            "totalParams": len(self.nodes) * 4 + len(self.edges) * 2,
            "depth": 6,
        }
