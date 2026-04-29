import sys

import flwr as fl

from app.model import RareDiseaseNet
from hospital_client.dataset import RareDiseaseDataset
from hospital_client.train import train_local
from hospital_client.utils import evaluate_model, get_parameters, set_parameters


CSV_PATH = sys.argv[1] if len(sys.argv) > 1 else "data/hospital_1.csv"
dataset = RareDiseaseDataset(CSV_PATH)
input_dim = dataset.X.shape[1]
model = RareDiseaseNet(input_dim=input_dim)


class HospitalClient(fl.client.NumPyClient):
    def get_parameters(self, config):
        return get_parameters(model)

    def fit(self, parameters, config):
        set_parameters(model, parameters)
        train_local(model, dataset, epochs=int(config.get("local_epochs", 3)))
        return get_parameters(model), len(dataset), {"hospital_data": CSV_PATH}

    def evaluate(self, parameters, config):
        set_parameters(model, parameters)
        metrics = evaluate_model(model, dataset)
        loss = 1.0 - metrics["accuracy"]
        return loss, len(dataset), metrics


if __name__ == "__main__":
    fl.client.start_numpy_client(
        server_address="127.0.0.1:8080",
        client=HospitalClient(),
    )
