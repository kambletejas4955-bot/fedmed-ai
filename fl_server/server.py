from collections import OrderedDict
from pathlib import Path

import flwr as fl
import torch
from flwr.common import parameters_to_ndarrays

from app.model import RareDiseaseNet


FEATURE_COUNT = 8
BASE_DIR = Path(__file__).resolve().parents[1]
SAVE_DIR = BASE_DIR / "saved_models"
SAVE_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = SAVE_DIR / "global_model.pt"


class SaveModelStrategy(fl.server.strategy.FedAvg):
    def aggregate_fit(self, server_round, results, failures):
        aggregated_parameters, aggregated_metrics = super().aggregate_fit(server_round, results, failures)

        if aggregated_parameters is not None:
            ndarrays = parameters_to_ndarrays(aggregated_parameters)
            model = RareDiseaseNet(input_dim=FEATURE_COUNT)
            params_dict = zip(model.state_dict().keys(), ndarrays)
            state_dict = OrderedDict({k: torch.tensor(v) for k, v in params_dict})
            model.load_state_dict(state_dict, strict=True)
            torch.save(model.state_dict(), MODEL_PATH)
            print(f"[Server] Saved global model after round {server_round} to {MODEL_PATH}")

        return aggregated_parameters, aggregated_metrics


def fit_config(server_round: int):
    return {"local_epochs": 3 if server_round < 3 else 5}


if __name__ == "__main__":
    strategy = SaveModelStrategy(
        fraction_fit=1.0,
        fraction_evaluate=1.0,
        min_fit_clients=3,
        min_evaluate_clients=3,
        min_available_clients=3,
        on_fit_config_fn=fit_config,
    )

    fl.server.start_server(
        server_address="0.0.0.0:8080",
        config=fl.server.ServerConfig(num_rounds=5),
        strategy=strategy,
    )
