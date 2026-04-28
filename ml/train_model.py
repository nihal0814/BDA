"""
Step 2: Train the Risk-Level classification model on the balanced dataset.

Usage:
    python train_model.py --data ./balanced_dataset.csv --model_dir ./artifacts

Outputs (saved to --model_dir):
  risk_model.pkl        — trained RandomForest / XGBoost model
  label_encoders.pkl    — fitted LabelEncoders for categorical inputs
  target_encoder.pkl    — LabelEncoder for Risk_Level
  feature_names.pkl     — ordered list of feature names expected by model
  metrics.json          — val accuracy, F1, confusion matrix
"""

import os
import json
import pickle
import argparse
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (
    classification_report, confusion_matrix,
    accuracy_score, f1_score
)
from sklearn.pipeline import Pipeline

# ─── FEATURE CONFIG ─────────────────────────────────────────────────────────
CATEGORICAL_COLS = [
    "Gender", "Mental_Health_History", "Any_Disease",
    "Due_To_Stress", "Hydration_Category", "Age_Group"
]
TARGET_COL = "Risk_Level"

NUMERIC_FEATURES = [
    "Age", "Heart_Rate", "Respiration_Rate",
    "Blood_Pressure_Systolic", "Blood_Pressure_Diastolic",
    "Sleep_Duration_Hours", "Active_Hours_Per_Day", "Screen_Time_Hours",
    "Caffeine_Intake_mg", "Stress_Level", "Deadline_Facing_Per_Month",
    "Physical_Activity_Sessions_Per_Week", "Water_Intake_Liters",
    "Mood_Rating", "Social_Interaction_Score", "Productivity_Score",
]

ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_COLS

# ─── HELPERS ────────────────────────────────────────────────────────────────

def load_and_prepare(path: str):
    df = pd.read_csv(path)
    print(f"[INFO] Dataset shape: {df.shape}")
    print(f"[INFO] Class distribution:\n{df[TARGET_COL].value_counts()}")

    # Fill missing
    df["Any_Disease"] = df["Any_Disease"].fillna("None")

    # Encode categoricals
    label_encoders = {}
    for col in CATEGORICAL_COLS:
        if col in df.columns:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col].astype(str))
            label_encoders[col] = le

    # Encode target
    target_encoder = LabelEncoder()
    df[TARGET_COL] = target_encoder.fit_transform(df[TARGET_COL])
    print(f"[INFO] Target classes: {dict(zip(target_encoder.classes_, target_encoder.transform(target_encoder.classes_)))}")

    available = [f for f in ALL_FEATURES if f in df.columns]
    X = df[available].values
    y = df[TARGET_COL].values

    return X, y, available, label_encoders, target_encoder


def train_model(X_train, y_train):
    """Train a GradientBoosting model (no external deps beyond sklearn)."""
    model = GradientBoostingClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.1,
        subsample=0.8,
        min_samples_split=20,
        random_state=42,
        verbose=1,
    )
    model.fit(X_train, y_train)
    return model


def train_random_forest(X_train, y_train):
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_split=10,
        class_weight="balanced",
        n_jobs=-1,
        random_state=42,
    )
    model.fit(X_train, y_train)
    return model


def evaluate(model, X_test, y_test, target_encoder):
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    f1  = f1_score(y_test, y_pred, average="weighted")
    cm  = confusion_matrix(y_test, y_pred).tolist()
    report = classification_report(
        y_test, y_pred,
        target_names=target_encoder.classes_,
        output_dict=True
    )
    print(f"\n[EVAL] Accuracy : {acc:.4f}")
    print(f"[EVAL] F1 (weighted): {f1:.4f}")
    print(classification_report(y_test, y_pred, target_names=target_encoder.classes_))
    return {"accuracy": acc, "f1_weighted": f1, "confusion_matrix": cm, "report": report}


def get_feature_importances(model, feature_names):
    if hasattr(model, "feature_importances_"):
        imp = model.feature_importances_
        return sorted(
            zip(feature_names, imp.tolist()),
            key=lambda x: x[1], reverse=True
        )
    return []


def save_artifacts(model, label_encoders, target_encoder, feature_names, metrics, output_dir):
    os.makedirs(output_dir, exist_ok=True)

    with open(os.path.join(output_dir, "risk_model.pkl"), "wb") as f:
        pickle.dump(model, f)

    with open(os.path.join(output_dir, "label_encoders.pkl"), "wb") as f:
        pickle.dump(label_encoders, f)

    with open(os.path.join(output_dir, "target_encoder.pkl"), "wb") as f:
        pickle.dump(target_encoder, f)

    with open(os.path.join(output_dir, "feature_names.pkl"), "wb") as f:
        pickle.dump(feature_names, f)

    with open(os.path.join(output_dir, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"\n[INFO] Artifacts saved to: {output_dir}")


# ─── MAIN ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data",      default="./balanced_dataset.csv")
    parser.add_argument("--model_dir", default="./artifacts")
    parser.add_argument(
        "--algorithm",
        choices=["gradient_boost", "random_forest"],
        default="random_forest",
        help="Model algorithm to train"
    )
    args = parser.parse_args()

    X, y, feature_names, label_encoders, target_encoder = load_and_prepare(args.data)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"\n[INFO] Train: {X_train.shape[0]:,}  |  Test: {X_test.shape[0]:,}")

    print(f"\n[INFO] Training {args.algorithm} …")
    if args.algorithm == "gradient_boost":
        model = train_model(X_train, y_train)
    else:
        model = train_random_forest(X_train, y_train)

    metrics = evaluate(model, X_test, y_test, target_encoder)

    # Feature importances
    fi = get_feature_importances(model, feature_names)
    metrics["feature_importances"] = fi
    print("\n[INFO] Top-10 feature importances:")
    for name, score in fi[:10]:
        print(f"  {name:<40} {score:.4f}")

    save_artifacts(model, label_encoders, target_encoder, feature_names, metrics, args.model_dir)


if __name__ == "__main__":
    main()
