from pathlib import Path

import pandas as pd
import torch
from torch.utils.data import Dataset


class RareDiseaseDataset(Dataset):
    def __init__(self, csv_path: str):
        path = Path(csv_path)
        if not path.exists():
            raise FileNotFoundError(f"Dataset file not found: {csv_path}")

        df = pd.read_csv(path)
        if "rare_disease_label" not in df.columns:
            raise ValueError("CSV must contain 'rare_disease_label' column")

        self.X = df.drop(columns=["rare_disease_label"]).values.astype("float32")
        self.y = df["rare_disease_label"].values.astype("float32")

    def __len__(self) -> int:
        return len(self.X)

    def __getitem__(self, idx: int):
        return torch.tensor(self.X[idx]), torch.tensor(self.y[idx])
