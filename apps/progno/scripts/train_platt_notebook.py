# %% [markdown]
# Platt calibration notebook
# - Input CSV: columns `model_p` (0..1) and `outcome` (0/1)
# - Outputs: platt_params.json, platt_diag.png
# - Usage: open in Jupyter or run as script:
#     python scripts/train_platt_notebook.py --input calibration.csv --out platt_params.json --diag platt_diag.png

# %%
import argparse
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import brier_score_loss, log_loss
from math import log

EPS = 1e-12

# %%
def safe_logit(p):
    p = np.clip(p, EPS, 1 - EPS)
    return np.log(p / (1 - p))

def fit_platt(logits, y, C=1.0):
    lr = LogisticRegression(C=C, solver='liblinear')
    X = logits.reshape(-1, 1)
    lr.fit(X, y)
    A = float(lr.coef_[0][0])
    B = float(lr.intercept_[0])
    return A, B, lr

def platt_predict(A, B, logits):
    z = A * logits + B
    return 1.0 / (1.0 + np.exp(z))

def reliability_diagram(y_true, probs, n_bins=10, ax=None, label=None):
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    binids = np.digitize(probs, bins) - 1
    bin_centers = (bins[:-1] + bins[1:]) / 2.0
    obs = []
    counts = []
    for i in range(n_bins):
        mask = binids == i
        counts.append(int(mask.sum()))
        if mask.sum() == 0:
            obs.append(np.nan)
        else:
            obs.append(float(y_true[mask].mean()))
    if ax is None:
        fig, ax = plt.subplots()
    ax.plot(bin_centers, obs, marker='o', label=label)
    ax.plot([0,1],[0,1], linestyle='--', color='gray')
    ax.set_xlim(0,1)
    ax.set_ylim(0,1)
    ax.set_xlabel('Predicted probability')
    ax.set_ylabel('Observed frequency')
    return ax, bin_centers, obs, counts

def evaluate(name, probs, y):
    brier = brier_score_loss(y, probs)
    ll = log_loss(y, probs, eps=EPS)
    print(f"{name}  Brier {brier:.6f}  LogLoss {ll:.6f}")
    return brier, ll

# %%
def run_platt_pipeline(df, C=1.0, n_splits=5, diag_path='platt_diag.png', out_path='platt_params.json'):
    if 'model_p' not in df.columns or 'outcome' not in df.columns:
        raise ValueError("CSV must contain columns: model_p,outcome")

    p = df['model_p'].astype(float).values
    y = df['outcome'].astype(int).values
    logits = safe_logit(p)

    print("Samples:", len(y), "Positive rate:", float(y.mean()))

    evaluate("Baseline", p, y)

    # Cross-validated Platt
    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    cv_preds = np.zeros_like(p)
    for train_idx, test_idx in skf.split(logits, y):
        A, B, _ = fit_platt(logits[train_idx], y[train_idx], C=C)
        cv_preds[test_idx] = platt_predict(A, B, logits[test_idx])

    evaluate("CV Platt", cv_preds, y)

    # Fit final on all data
    A_final, B_final, _ = fit_platt(logits, y, C=C)
    calibrated = platt_predict(A_final, B_final, logits)
    evaluate("Final Platt", calibrated, y)

    # Reliability diagram
    fig, ax = plt.subplots(figsize=(6,6))
    reliability_diagram(y, p, n_bins=10, ax=ax, label='Uncalibrated')
    reliability_diagram(y, calibrated, n_bins=10, ax=ax, label='Platt Calibrated')
    ax.legend()
    ax.set_title('Reliability Diagram')
    plt.tight_layout()
    fig.savefig(diag_path)
    print("Saved diagnostic plot to", diag_path)

    out = {
        "A": float(A_final),
        "B": float(B_final),
        "n_samples": int(len(y)),
        "brier_before": float(brier_score_loss(y, p)),
        "brier_after": float(brier_score_loss(y, calibrated)),
        "pos_rate": float(y.mean())
    }
    with open(out_path, 'w') as f:
        json.dump(out, f, indent=2)
    print("Wrote", out_path)
    return out

# %%
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="CSV with model_p,outcome")
    parser.add_argument("--out", default="platt_params.json", help="Output JSON")
    parser.add_argument("--diag", default="platt_diag.png", help="Diagnostic PNG")
    parser.add_argument("--C", type=float, default=1.0, help="Inverse regularization for logistic regression")
    parser.add_argument("--folds", type=int, default=5, help="CV folds")
    args = parser.parse_args()

    df = pd.read_csv(args.input)
    run_platt_pipeline(df, C=args.C, n_splits=args.folds, diag_path=args.diag, out_path=args.out)
