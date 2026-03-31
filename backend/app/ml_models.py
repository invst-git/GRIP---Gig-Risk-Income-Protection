from pathlib import Path
import pickle

BASE_DIR   = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = BASE_DIR / "ml-data" / "models"

def _load(filename):
    with open(MODELS_DIR / filename, "rb") as f:
        return pickle.load(f)

zone_risk_model  = _load("zone_risk_model.pkl")
encoder_bundle   = _load("encoder.pkl")   # dict with keys: encoder, cat_features, num_features
fraud_bundle     = _load("fraud_model.pkl")  # dict with keys: model, features