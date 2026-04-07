import os
import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, LabelEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report
from sklearn.ensemble import RandomForestClassifier
import joblib

# 1) Load the CSV file
preferred_csv = "Road Accident Data.csv"
fallback_csv = "US_Accidents_March23.csv"

csv_path = preferred_csv if os.path.exists(preferred_csv) else fallback_csv
if not os.path.exists(csv_path):
    raise FileNotFoundError(
        f"Could not find '{preferred_csv}' or '{fallback_csv}'. Put your CSV in the workspace."
    )

df = pd.read_csv(csv_path)

# 2) Display column names and first few rows
print("Columns:", df.columns.tolist())
print("\nHead:\n", df.head())

# 3) Select "Accident_Severity" as the target variable
target_col = "Accident_Severity"
if target_col not in df.columns and "Severity" in df.columns:
    target_col = "Severity"

if target_col not in df.columns:
    raise ValueError("Accident_Severity (or Severity) column not found in the dataset.")

y = df[target_col].copy()

# 4) Use all other columns as features
X = df.drop(columns=[target_col]).copy()

# 6) Fill missing numerical values with median
# 7) Fill missing categorical values with mode
num_cols = X.select_dtypes(include=[np.number]).columns.tolist()
cat_cols = X.select_dtypes(exclude=[np.number]).columns.tolist()

for col in num_cols:
    X[col] = X[col].fillna(X[col].median())

for col in cat_cols:
    if X[col].isna().any():
        X[col] = X[col].fillna(X[col].mode(dropna=True)[0])

# Encode target if it is categorical
if not pd.api.types.is_numeric_dtype(y):
    target_encoder = LabelEncoder()
    y = target_encoder.fit_transform(y)
else:
    target_encoder = None

# 5) Encode categorical columns using OneHotEncoder
transformers = []
if cat_cols:  # Only add OneHotEncoder if there are categorical columns
    transformers.append(("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols))

if not transformers:  # If no categorical columns, just pass through
    preprocess = ColumnTransformer(
        transformers=[("pass", "passthrough", num_cols)],
        remainder="passthrough",
    )
else:
    preprocess = ColumnTransformer(
        transformers=transformers,
        remainder="passthrough",
    )

# 8) Split dataset into 70% train, 20% test, 10% validation
X_train, X_temp, y_train, y_temp = train_test_split(
    X, y, test_size=0.30, random_state=42, stratify=y
)
X_test, X_val, y_test, y_val = train_test_split(
    X_temp, y_temp, test_size=1 / 3, random_state=42, stratify=y_temp
)

# 9) Create RandomForestClassifier
model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)

# 10) Train the model on training data (with preprocessing)
clf = Pipeline(steps=[("preprocess", preprocess), ("model", model)])
clf.fit(X_train, y_train)

# 11) Predict on test data
y_pred = clf.predict(X_test)

# 12) Print accuracy and classification report
print("\nAccuracy:", accuracy_score(y_test, y_pred))
print("\nClassification Report:\n", classification_report(y_test, y_pred))

# 13) Save trained model
try:
    joblib.dump(
        {"model": clf, "target_encoder": target_encoder, "feature_columns": X.columns.tolist()},
        "road_accident_rf_model.pkl",
    )
    print("\nModel saved as road_accident_rf_model.pkl")
except Exception as e:
    print(f"\nError saving model: {e}")
