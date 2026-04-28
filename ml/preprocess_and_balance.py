"""
Step 1: Preprocess and balance the skewed dataset.
Run this FIRST before training.

Usage:
    python preprocess_and_balance.py --input ../../data/DashBoard_dataset.csv --output ./balanced_dataset.csv
"""

import pandas as pd
import numpy as np
from collections import Counter
import argparse
import os

# ─── CONSTANTS ──────────────────────────────────────────────────────────────
CATEGORICAL_COLS = [
    "Gender", "Mental_Health_History", "Any_Disease",
    "Due_To_Stress", "Hydration_Category", "Age_Group"
]
TARGET_COL = "Risk_Level"
# Engineered features already in dataset — drop to avoid leakage
DERIVED_COLS = ["Pulse_Pressure", "Sleep_to_Screen_Ratio", "Activity_to_Stress_Ratio"]

# ─── HELPERS ────────────────────────────────────────────────────────────────

def load_data(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    print(f"[INFO] Loaded {len(df):,} rows × {df.shape[1]} cols")
    print(f"[INFO] Class distribution before balancing:\n{df[TARGET_COL].value_counts()}\n")
    return df


def fill_missing(df: pd.DataFrame) -> pd.DataFrame:
    """Fill Any_Disease NaN with 'None' (patient has no disease)."""
    df = df.copy()
    df["Any_Disease"] = df["Any_Disease"].fillna("None")
    print(f"[INFO] Missing values after fill:\n{df.isnull().sum()[df.isnull().sum() > 0]}")
    return df


def encode_categoricals(df: pd.DataFrame):
    """Label-encode categoricals and return df + label mappings."""
    from sklearn.preprocessing import LabelEncoder
    df = df.copy()
    encoders = {}
    for col in CATEGORICAL_COLS:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))
        encoders[col] = le
        print(f"[INFO] Encoded '{col}' → {dict(zip(le.classes_, le.transform(le.classes_)))}")
    return df, encoders


def balance_with_undersampling(df: pd.DataFrame, target_col: str) -> pd.DataFrame:
    """
    Strategy:
      - High class is over-represented → under-sample it.
      - Medium & Low are nearly equal → keep all rows.
      - Final balance: ~equal counts across all three classes.
    """
    counts = df[target_col].value_counts()
    min_count = int(counts.min())
    print(f"\n[INFO] Balancing via under-sampling to {min_count:,} per class …")

    frames = []
    for label, grp in df.groupby(target_col):
        if len(grp) > min_count:
            grp = grp.sample(n=min_count, random_state=42)
        frames.append(grp)

    balanced = pd.concat(frames).sample(frac=1, random_state=42).reset_index(drop=True)
    print(f"[INFO] Balanced distribution:\n{balanced[target_col].value_counts()}\n")
    return balanced


def balance_with_smote_like(df: pd.DataFrame, target_col: str) -> pd.DataFrame:
    """
    Pure-pandas synthetic over-sampling (SMOTE-lite) for minority classes.
    Generates synthetic rows by interpolating between random pairs of same-class samples.
    """
    counts = df[target_col].value_counts()
    max_count = int(counts.max())
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    numeric_cols = [c for c in numeric_cols if c != target_col]

    print(f"\n[INFO] Balancing via SMOTE-lite to {max_count:,} per class …")
    frames = []
    for label, grp in df.groupby(target_col):
        need = max_count - len(grp)
        if need > 0:
            idx1 = grp.sample(n=need, replace=True, random_state=42).reset_index(drop=True)
            idx2 = grp.sample(n=need, replace=True, random_state=99).reset_index(drop=True)
            alpha = np.random.uniform(0, 1, size=(need, 1))
            synthetic = idx1.copy()
            synthetic[numeric_cols] = (
                idx1[numeric_cols].values * alpha +
                idx2[numeric_cols].values * (1 - alpha)
            )
            # For categorical/integer cols snap to nearest int
            int_cols = grp.select_dtypes(include=[np.integer]).columns
            for ic in int_cols:
                synthetic[ic] = synthetic[ic].round().astype(int)
            grp = pd.concat([grp, synthetic], ignore_index=True)
        frames.append(grp)

    balanced = pd.concat(frames).sample(frac=1, random_state=42).reset_index(drop=True)
    print(f"[INFO] Balanced distribution:\n{balanced[target_col].value_counts()}\n")
    return balanced


def save(df: pd.DataFrame, path: str):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    df.to_csv(path, index=False)
    print(f"[INFO] Saved balanced dataset → {path}  ({len(df):,} rows)")


# ─── MAIN ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input",  default="../../data/DashBoard_dataset.csv")
    parser.add_argument("--output", default="./balanced_dataset.csv")
    parser.add_argument(
        "--strategy",
        choices=["undersample", "smote"],
        default="undersample",
        help="'undersample' keeps dataset smaller; 'smote' inflates minority classes"
    )
    args = parser.parse_args()

    df = load_data(args.input)
    df = fill_missing(df)

    # Drop derived/engineered columns — they would cause data leakage
    df.drop(columns=[c for c in DERIVED_COLS if c in df.columns], inplace=True)
    print(f"[INFO] Dropped engineered cols: {DERIVED_COLS}")

    if args.strategy == "undersample":
        balanced = balance_with_undersampling(df, TARGET_COL)
    else:
        balanced = balance_with_smote_like(df, TARGET_COL)

    save(balanced, args.output)


if __name__ == "__main__":
    main()
