# scripts/walkforward_platt.py
# Usage:
#   python scripts/walkforward_platt.py --input calibration.csv --window 1000 --step 250 --out walk_platt_report.json
import argparse
import json
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss

EPS = 1e-12

def safe_logit(p):
    p = np.clip(p, EPS, 1 - EPS)
    return np.log(p / (1 - p))

def fit_platt(logits, y, C=1.0):
    lr = LogisticRegression(C=C, solver='liblinear')
    X = logits.reshape(-1, 1)
    lr.fit(X, y)
    A = float(lr.coef_[0][0])
    B = float(lr.intercept_[0])
    return A, B

def platt_predict(A, B, logits):
    z = A * logits + B
    return 1.0 / (1.0 + np.exp(z))

def evaluate(probs, y):
    return float(brier_score_loss(y, probs)), float(log_loss(y, probs, eps=EPS))

def run_walkforward(df, window=1000, step=250, C=1.0):
    # df must be time-ordered (oldest first)
    p = df['model_p'].astype(float).values
    y = df['outcome'].astype(int).values
    logits = safe_logit(p)
    n = len(p)
    results = []
    start = 0
    while start + window + 1 < n:
        train_idx = np.arange(start, start + window)
        test_idx = np.arange(start + window, min(start + window + step, n))
        if len(test_idx) == 0:
            break
        A, B = fit_platt(logits[train_idx], y[train_idx], C=C)
        preds_test = platt_predict(A, B, logits[test_idx])
        brier, ll = evaluate(preds_test, y[test_idx])
        results.append({
            "train_start": int(start),
            "train_end": int(start + window - 1),
            "test_start": int(start + window),
            "test_end": int(test_idx[-1]),
            "A": A,
            "B": B,
            "brier": brier,
            "logloss": ll,
            "n_test": int(len(test_idx))
        })
        start += step
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--window", type=int, default=1000)
    parser.add_argument("--step", type=int, default=250)
    parser.add_argument("--C", type=float, default=1.0)
    parser.add_argument("--out", default="walk_platt_report.json")
    args = parser.parse_args()

    df = pd.read_csv(args.input)
    # Ensure chronological order: user must provide time-ordered CSV or include a date column and sort
    if 'timestamp' in df.columns:
        df = df.sort_values('timestamp').reset_index(drop=True)
    results = run_walkforward(df, window=args.window, step=args.step, C=args.C)
    with open(args.out, 'w') as f:
        json.dump(results, f, indent=2)
    print("Wrote", args.out)
