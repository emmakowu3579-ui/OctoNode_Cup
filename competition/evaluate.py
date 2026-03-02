# competition/evaluate.py

import pandas as pd
import sys
from metrics import macro_f1
from validate_submission import main as validate_submission


def main(pred_path, label_path):
    # Validate submission structure first
    validate_submission(pred_path, label_path)

    preds = pd.read_csv(pred_path)
    labels = pd.read_csv(label_path)

    # Sort by id to ensure alignment
    preds = preds.sort_values("id").reset_index(drop=True)
    labels = labels.sort_values("id").reset_index(drop=True)

    if not preds["id"].equals(labels["id"]):
        raise ValueError("ID mismatch after sorting")

    score = macro_f1(labels["ml_target"], preds["ml_target"])

    print(f"SCORE={score:.8f}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise ValueError("Usage: python evaluate.py <predictions.csv> <labels.csv>")

    main(sys.argv[1], sys.argv[2])
