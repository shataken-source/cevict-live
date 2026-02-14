# scripts/generate_synthetic_calibration.py
import csv
import random
from datetime import datetime, timedelta

def generate(n=500, start_date=datetime(2025,10,1)):
    rows = []
    for i in range(n):
        # simulate model probabilities with some calibration error
        base = random.betavariate(2,2)  # roughly centered
        noise = random.gauss(0, 0.08)
        p = max(0.001, min(0.999, base + noise))
        # simulate outcome with true underlying probability slightly different
        true_p = max(0.001, min(0.999, base*0.9 + 0.05))
        outcome = 1 if random.random() < true_p else 0
        ts = (start_date + timedelta(hours=i*3)).isoformat() + "Z"
        rows.append((f"{p:.3f}", str(outcome), ts))
    return rows

if __name__ == "__main__":
    rows = generate(1000)
    with open("calibration_synthetic.csv", "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["model_p","outcome","timestamp"])
        writer.writerows(rows)
    print("Wrote calibration_synthetic.csv with", len(rows), "rows")
