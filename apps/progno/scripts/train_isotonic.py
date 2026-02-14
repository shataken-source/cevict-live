# scripts/train_isotonic.py
# Usage: python scripts/train_isotonic.py --input calibration.csv --out isotonic_params.npz --diag isotonic_diag.png

import argparse
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import brier_score_loss, log_loss

EPS = 1e-12

def evaluate(name, probs, y):
    brier = brier_score_loss(y, probs)
    ll = log_loss(y, probs, eps=EPS)
    print(f"{name}  Brier {brier:.6f}  LogLoss {ll:.6f}")
    return brier, ll

def reliability_diagram(y_true, probs, n_bins=10, ax=None, label=None):
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    binids = np.digitize(probs, bins) - 1
    bin_centers = (bins[:-1] + bins[1:]) / 2.0
    obs = []
    for i in range(n_bins):
        mask = binids == i
        if mask.sum() == 0:
            obs.append(np.nan)
        else:
            obs.append(y_true[mask].mean())
    if ax is None:
        fig, ax = plt.subplots()
    ax.plot(bin_centers, obs, marker='o', label=label)
    ax.plot([0,1],[0,1], linestyle='--', color='gray')
    ax.set_xlim(0,1)
    ax.set_ylim(0,1)
    ax.set_xlabel('Predicted probability')
    ax.set_ylabel('Observed frequency')
    return ax

def main(args):
    df = pd.read_csv(args.input)
    if 'model_p' not in df.columns or 'outcome' not in df.columns:
        raise SystemExit("CSV must contain columns: model_p,outcome")

    p = df['model_p'].astype(float).values
    y = df['outcome'].astype(int).values

    print("Samples:", len(y), "Positive rate:", y.mean())
    evaluate("Baseline", p, y)

    # Fit isotonic on model_p -> outcome
    iso = IsotonicRegression(out_of_bounds='clip')
    iso.fit(p, y)
    calibrated = iso.predict(p)
    evaluate("Isotonic", calibrated, y)

    # Save mapping (x,y) for loader
    xs = np.linspace(0,1,1001)
    ys = iso.predict(xs)
    np.savez(args.out, xs=xs, ys=ys)
    print("Saved isotonic mapping to", args.out)

    # Plot
    fig, ax = plt.subplots(figsize=(6,6))
    reliability_diagram(y, p, n_bins=10, ax=ax, label='Uncalibrated')
    reliability_diagram(y, calibrated, n_bins=10, ax=ax, label='Isotonic Calibrated')
    ax.legend()
    ax.set_title('Reliability Diagram (Isotonic)')
    plt.tight_layout()
    fig.savefig(args.diag)
    print("Saved diagnostic plot to", args.diag)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="CSV with model_p,outcome")
    parser.add_argument("--out", default="isotonic_params.npz", help="Output NPZ")
    parser.add_argument("--diag", default="isotonic_diag.png", help="Diagnostic PNG")
    main(parser.parse_args())
