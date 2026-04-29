import torch.nn as nn
from torch.utils.data import DataLoader


def train_local(model, dataset, epochs: int = 3, batch_size: int = 16, lr: float = 1e-3):
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    criterion = nn.BCELoss()
    optimizer = __import__("torch").optim.Adam(model.parameters(), lr=lr)

    model.train()
    for _ in range(epochs):
        for features, labels in loader:
            labels = labels.view(-1, 1)
            preds = model(features)
            loss = criterion(preds, labels)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

    return model
