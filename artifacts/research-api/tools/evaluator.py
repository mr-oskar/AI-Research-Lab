"""
Dynamic Evaluation Engine
Safely evaluates mathematical equations proposed by agents on synthetic datasets.
"""

import math
import random
import time
from typing import Any, Dict, List, Tuple


SAFE_GLOBALS = {
    "__builtins__": {},
    "math": math,
    "abs": abs,
    "min": min,
    "max": max,
    "sum": sum,
    "len": len,
    "range": range,
    "round": round,
    "pow": pow,
    "exp": math.exp,
    "log": math.log,
    "sqrt": math.sqrt,
    "sin": math.sin,
    "cos": math.cos,
    "tanh": math.tanh,
    "sigmoid": lambda x: 1 / (1 + math.exp(-max(-500, min(500, x)))),
    "relu": lambda x: max(0, x),
    "pi": math.pi,
    "e": math.e,
}

DATASET_TEMPLATES = {
    "normal": lambda n: [(random.gauss(0, 1), random.gauss(0, 1)) for _ in range(n)],
    "drift": lambda n: [(i / n + random.gauss(0, 0.1), math.sin(i / n * math.pi) + random.gauss(0, 0.1)) for i in range(n)],
    "ood": lambda n: [(random.uniform(5, 10), random.uniform(5, 10)) for _ in range(n)],
    "adversarial": lambda n: [(random.gauss(0, 1) + random.choice([-3, 3]), random.gauss(0, 1)) for _ in range(n)],
    "catastrophic": lambda n: [(random.choice([random.gauss(0, 0.1), random.uniform(-10, 10)]), random.gauss(0, 1)) for _ in range(n)],
}


def generate_dataset(stream_type: str = "normal", n: int = 50) -> List[Tuple[float, float]]:
    gen = DATASET_TEMPLATES.get(stream_type, DATASET_TEMPLATES["normal"])
    return gen(n)


def evaluate_formula(formula_code: str, dataset: List[Tuple], stream_type: str = "normal") -> Dict[str, Any]:
    """
    Safely evaluate a mathematical formula on a dataset.
    formula_code is a Python expression receiving x, y, t (step index, 0..1).
    Returns metrics.
    """
    start = time.time()
    errors = []
    predictions = []
    targets = []

    for idx, (x, y) in enumerate(dataset):
        t = idx / max(len(dataset) - 1, 1)
        local_vars = {"x": x, "y": y, "t": t, "idx": idx, **SAFE_GLOBALS}
        try:
            pred = eval(formula_code, {"__builtins__": {}}, local_vars)
            if not isinstance(pred, (int, float)) or math.isnan(pred) or math.isinf(pred):
                pred = 0.0
            predictions.append(float(pred))
            targets.append(y)
            errors.append(abs(float(pred) - y))
        except Exception:
            predictions.append(0.0)
            targets.append(y)
            errors.append(abs(y))

    n = len(errors)
    if n == 0:
        return _zero_metrics(stream_type)

    mse = sum(e ** 2 for e in errors) / n
    mae = sum(errors) / n
    rmse = math.sqrt(mse)

    variance = sum((p - sum(predictions) / n) ** 2 for p in predictions) / max(n - 1, 1)
    target_var = sum((t_ - sum(targets) / n) ** 2 for t_ in targets) / max(n - 1, 1)
    r2 = 1 - mse / max(target_var, 1e-9)

    convergence_speed = max(0.0, min(1.0, 1.0 - rmse / (1 + rmse)))
    generalization_index = max(0.0, min(1.0, r2 * (1 - 0.3 * (stream_type != "normal"))))
    synaptic_stability = max(0.0, min(1.0, 1.0 - variance / (1 + variance)))
    loss = mse
    elapsed = time.time() - start

    return {
        "convergenceSpeed": round(convergence_speed, 4),
        "generalizationIndex": round(max(0.0, generalization_index), 4),
        "synapticStability": round(synaptic_stability, 4),
        "loss": round(loss, 6),
        "mse": round(mse, 6),
        "mae": round(mae, 6),
        "r2": round(r2, 4),
        "evaluationTime": round(elapsed * 1000, 2),
        "numSamples": n,
        "streamType": stream_type,
    }


def _zero_metrics(stream_type: str) -> Dict[str, Any]:
    return {
        "convergenceSpeed": 0.0,
        "generalizationIndex": 0.0,
        "synapticStability": 0.0,
        "loss": 1.0,
        "mse": 1.0,
        "mae": 1.0,
        "r2": 0.0,
        "evaluationTime": 0.0,
        "numSamples": 0,
        "streamType": stream_type,
    }
