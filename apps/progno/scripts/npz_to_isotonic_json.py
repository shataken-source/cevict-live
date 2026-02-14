# scripts/npz_to_isotonic_json.py
# Usage: python scripts/npz_to_isotonic_json.py --in isotonic_params.npz --out isotonic_mapping.json
import argparse
import numpy as np
import json

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="inp", required=True)
    parser.add_argument("--out", dest="out", default="isotonic_mapping.json")
    args = parser.parse_args()

    d = np.load(args.inp)
    xs = d['xs'].tolist()
    ys = d['ys'].tolist()
    with open(args.out, 'w') as f:
        json.dump({"xs": xs, "ys": ys}, f)
    print("Wrote", args.out)
