# ML model training distribution parameters
# Used by fraud_psi.py for drift detection
# Source: data_generator.py Uniform(0.01, 0.15) for legitimate KL divergence

KL_TRAINING_MEAN = 0.08
KL_TRAINING_STD = 0.041
KL_TRAINING_LOW = 0.01
KL_TRAINING_HIGH = 0.15

# Synthetic fraud feature defaults
# Each is a documented placeholder - replacement point noted inline
FRAUD_DEFAULT_NOCTURNAL_FRACTION = 0.10
FRAUD_DEFAULT_CANCELLATION_RATIO = 0.05
FRAUD_DEFAULT_NETWORK_REUSE_COUNT = 0
FRAUD_DEFAULT_FNOL_DELTA_HOURS_MINIMUM = 1.0
