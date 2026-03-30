"""
GRIP Model Trainer
Trains:
  1. XGBoost Zone Risk Scorer        -> models/zone_risk_model.pkl
  2. Isolation Forest Fraud Detector -> models/fraud_model.pkl
  3. Feature encoder                 -> models/encoder.pkl

Run after data_generator.py
"""

from pathlib import Path
import pickle
import math

import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report, mean_absolute_error, mean_squared_error
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OrdinalEncoder
from xgboost import XGBRegressor

from data_generator import CITY_HAZARD, SEASON_WEATHER_WEIGHTS, ZONE_FLOOD_RISK

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(exist_ok=True)

CAT_FEATURES = ["city", "zone", "vehicle_type", "platform", "season"]
NUM_FEATURES = [
    "month",
    "avg_daily_orders",
    "avg_daily_hours",
    "effective_heat_days",
    "effective_rain_days",
    "effective_aqi_days",
    "zone_flood_risk",
]
FRAUD_FEATURES = [
    "claim_lag_hours",
    "prior_orders_48h",
    "claim_hour",
    "prior_claims_30d",
    "device_returning",
    "zone_match",
    "device_tampered",
    "nocturnal_fraction",
    "cancellation_ratio",
    "network_reuse_count",
    "fnol_last_trip_delta_hours",
    "activity_kl_divergence",
]


def build_zone_case(
    *,
    city,
    zone,
    vehicle_type,
    platform,
    season,
    month,
    avg_daily_orders,
    avg_daily_hours,
):
    hazard = CITY_HAZARD[city]

    return {
        "city": city,
        "zone": zone,
        "vehicle_type": vehicle_type,
        "platform": platform,
        "season": season,
        "month": month,
        "avg_daily_orders": avg_daily_orders,
        "avg_daily_hours": avg_daily_hours,
        "effective_heat_days": round(
            hazard["heat_days"] * SEASON_WEATHER_WEIGHTS["heat"][month - 1], 3
        ),
        "effective_rain_days": round(
            hazard["rain_days"] * SEASON_WEATHER_WEIGHTS["rain"][month - 1], 3
        ),
        "effective_aqi_days": round(
            hazard["aqi_days"] * SEASON_WEATHER_WEIGHTS["aqi"][month - 1], 3
        ),
        "zone_flood_risk": ZONE_FLOOD_RISK.get(zone, 1.10),
    }


def require_dataset(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(
            f"Missing dataset: {path}. Run `python data_generator.py` from ml-data first."
        )


def train_zone_risk_model():
    zone_risk_path = DATA_DIR / "zone_risk_training.csv"
    require_dataset(zone_risk_path)

    df = pd.read_csv(zone_risk_path)
    x_cat = df[CAT_FEATURES]
    x_num = df[NUM_FEATURES]
    y = df["zone_risk_score"]

    x_train_cat, x_valid_cat, x_train_num, x_valid_num, y_train, y_valid = train_test_split(
        x_cat,
        x_num,
        y,
        test_size=0.2,
        random_state=42,
    )

    encoder = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
    train_cat = pd.DataFrame(
        encoder.fit_transform(x_train_cat), columns=CAT_FEATURES, index=x_train_cat.index
    )
    valid_cat = pd.DataFrame(
        encoder.transform(x_valid_cat), columns=CAT_FEATURES, index=x_valid_cat.index
    )

    x_train = pd.concat(
        [train_cat.reset_index(drop=True), x_train_num.reset_index(drop=True)], axis=1
    )
    x_valid = pd.concat(
        [valid_cat.reset_index(drop=True), x_valid_num.reset_index(drop=True)], axis=1
    )

    model = XGBRegressor(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        verbosity=0,
    )
    model.fit(x_train, y_train)

    train_preds = model.predict(x_train)
    valid_preds = model.predict(x_valid)

    print(f"[Zone Risk] Train rows   : {len(x_train):,}")
    print(f"[Zone Risk] Valid rows   : {len(x_valid):,}")
    print(f"[Zone Risk] Train MAE    : {mean_absolute_error(y_train, train_preds):.4f}")
    print(f"[Zone Risk] Valid MAE    : {mean_absolute_error(y_valid, valid_preds):.4f}")
    valid_rmse = math.sqrt(mean_squared_error(y_valid, valid_preds))
    print(
        f"[Zone Risk] Valid RMSE   : "
        f"{valid_rmse:.4f}"
    )
    print(f"[Zone Risk] Valid range  : {valid_preds.min():.2f} - {valid_preds.max():.2f}")

    test_cases = [
        build_zone_case(
            city="Bengaluru",
            zone="Indiranagar",
            vehicle_type="Two-Wheeler ICE",
            platform="Swiggy",
            season="Post-monsoon",
            month=10,
            avg_daily_orders=20,
            avg_daily_hours=8,
        ),
        build_zone_case(
            city="Mumbai",
            zone="Chembur",
            vehicle_type="Two-Wheeler EV",
            platform="Zomato",
            season="Monsoon",
            month=7,
            avg_daily_orders=25,
            avg_daily_hours=9,
        ),
        build_zone_case(
            city="Delhi",
            zone="Yamuna Floodplain",
            vehicle_type="Two-Wheeler ICE",
            platform="Zomato",
            season="Monsoon",
            month=8,
            avg_daily_orders=32,
            avg_daily_hours=11,
        ),
        build_zone_case(
            city="Delhi",
            zone="Connaught Place",
            vehicle_type="Two-Wheeler ICE",
            platform="Zomato",
            season="Winter",
            month=1,
            avg_daily_orders=28,
            avg_daily_hours=10,
        ),
        build_zone_case(
            city="Chennai",
            zone="Pallikaranai",
            vehicle_type="Bicycle",
            platform="Swiggy",
            season="Post-monsoon",
            month=11,
            avg_daily_orders=18,
            avg_daily_hours=7,
        ),
    ]

    test_case_df = pd.DataFrame(test_cases)
    test_case_cat = pd.DataFrame(
        encoder.transform(test_case_df[CAT_FEATURES]),
        columns=CAT_FEATURES,
        index=test_case_df.index,
    )
    test_case_x = pd.concat(
        [test_case_cat.reset_index(drop=True), test_case_df[NUM_FEATURES].reset_index(drop=True)],
        axis=1,
    )
    test_case_preds = model.predict(test_case_x)

    print("\n[Zone Risk] Sanity check - premium spread:")
    print(f"  {'City':12} {'Zone':22} {'Score':>6}  {'Basic':>8}  {'Std':>6}  {'Premium':>9}")
    print(f"  {'-' * 12} {'-' * 22} {'-' * 6}  {'-' * 8}  {'-' * 6}  {'-' * 9}")
    for index, test_case in enumerate(test_cases):
        score = test_case_preds[index]
        print(
            f"  {test_case['city']:12} {test_case['zone']:22} {score:.2f}   "
            f"Rs {round(49 * score * 1.00):>4}   "
            f"Rs {round(49 * score * 1.25):>4}   "
            f"Rs {round(49 * score * 1.50):>4}"
        )

    with open(MODELS_DIR / "zone_risk_model.pkl", "wb") as file:
        pickle.dump(model, file)
    with open(MODELS_DIR / "encoder.pkl", "wb") as file:
        pickle.dump(
            {
                "encoder": encoder,
                "cat_features": CAT_FEATURES,
                "num_features": NUM_FEATURES,
            },
            file,
        )
    print("\n[Zone Risk] Saved -> models/zone_risk_model.pkl + models/encoder.pkl")
    return model, encoder


def train_fraud_model():
    fraud_path = DATA_DIR / "fraud_detection_training.csv"
    require_dataset(fraud_path)

    df = pd.read_csv(fraud_path)
    train_df, valid_df = train_test_split(
        df,
        test_size=0.2,
        random_state=42,
        stratify=df["is_fraud"],
    )
    train_legit_df = train_df[train_df["is_fraud"] == 0]
    x_train = train_legit_df[FRAUD_FEATURES].values
    x_valid = valid_df[FRAUD_FEATURES].values
    y_valid = valid_df["is_fraud"].values

    actual_fraud_rate = df["is_fraud"].mean()
    print(f"\n[Fraud] Train legit rows : {len(train_legit_df):,}")
    print(f"[Fraud] Valid rows      : {len(valid_df):,}")
    print(
        f"[Fraud] Dataset         : {len(df):,} records, "
        f"{df['is_fraud'].sum():,} fraud ({actual_fraud_rate * 100:.2f}%)"
    )

    model = IsolationForest(
        n_estimators=200,
        contamination=actual_fraud_rate,
        max_features=0.8,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(x_train)

    raw_preds = model.predict(x_valid)
    fraud_flags = (raw_preds == -1).astype(int)

    print("\n[Fraud] Holdout classification report:")
    print(
        classification_report(
            y_valid,
            fraud_flags,
            target_names=["Legit", "Fraud"],
            zero_division=0,
        )
    )

    scores = model.score_samples(x_valid)
    valid_results = valid_df.copy()
    valid_results["anomaly_score"] = scores
    valid_results["fraud_flag"] = fraud_flags

    k = max(1, int(len(valid_results) * actual_fraud_rate))
    top_k = valid_results.nsmallest(k, "anomaly_score")
    precision_at_k = top_k["is_fraud"].mean()
    print(f"[Fraud] Precision@Top{k}: {precision_at_k:.2%}")

    legit_med = valid_results[valid_results["is_fraud"] == 0]["anomaly_score"].median()
    fraud_med = valid_results[valid_results["is_fraud"] == 1]["anomaly_score"].median()
    print(
        f"[Fraud] Anomaly score - legit median: {legit_med:.4f}, "
        f"fraud median: {fraud_med:.4f}, "
        f"delta: {legit_med - fraud_med:.4f}"
    )

    with open(MODELS_DIR / "fraud_model.pkl", "wb") as file:
        pickle.dump({"model": model, "features": FRAUD_FEATURES}, file)
    print("\n[Fraud] Saved -> models/fraud_model.pkl")
    return model


if __name__ == "__main__":
    print("=" * 58)
    print("Training Zone Risk Scorer (XGBoost)")
    print("=" * 58)
    train_zone_risk_model()

    print("\n" + "=" * 58)
    print("Training Fraud Detector (Isolation Forest)")
    print("=" * 58)
    train_fraud_model()

    print("\nAll models saved to models/")
    print("FastAPI endpoints: POST /ml/premium-quote  POST /ml/fraud-score")
