import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

# 1) Load the CSV file
csv_path = "US_Accidents_March23.csv"
df = pd.read_csv(csv_path)

# 2) Handle missing values (numerical -> median, categorical -> mode)
num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
cat_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()

for col in num_cols:
    df[col] = df[col].fillna(df[col].median())

for col in cat_cols:
    if df[col].isna().any():
        df[col] = df[col].fillna(df[col].mode(dropna=True)[0])

# 3) Remove duplicate rows
df = df.drop_duplicates()

# 4) Detect and remove outliers using IQR (numerical columns only)
def remove_iqr_outliers(data, columns):
    mask = pd.Series(True, index=data.index)
    for col in columns:
        q1 = data[col].quantile(0.25)
        q3 = data[col].quantile(0.75)
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        mask &= data[col].between(lower, upper)
    return data[mask]

df = remove_iqr_outliers(df, num_cols)

# 7) Convert Accident_Severity into 3 classes: Low, Medium, High
if "Accident_Severity" in df.columns:
    if pd.api.types.is_numeric_dtype(df["Accident_Severity"]):
        df["Accident_Severity"] = pd.qcut(
            df["Accident_Severity"], q=3, labels=["Low", "Medium", "High"]
        )
    else:
        mapping = {
            "Minor": "Low",
            "Moderate": "Medium",
            "Severe": "High",
        }
        df["Accident_Severity"] = df["Accident_Severity"].replace(mapping)

# Prepare features and target
if "Accident_Severity" in df.columns:
    X = df.drop(columns=["Accident_Severity"])
    y = df["Accident_Severity"]
else:
    X = df.copy()
    y = None

# Recompute column lists after transformations
num_cols = X.select_dtypes(include=[np.number]).columns.tolist()
cat_cols = X.select_dtypes(exclude=[np.number]).columns.tolist()

# 5) OneHotEncode categorical columns + 6) StandardScale numerical columns
preprocess = ColumnTransformer(
    transformers=[
        ("num", StandardScaler(), num_cols),
        ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
    ]
)

pipeline = Pipeline(steps=[("preprocess", preprocess)])
X_processed = pipeline.fit_transform(X)

# 8) Split data into 70% train, 20% test, 10% validation
if y is not None:
    X_train, X_temp, y_train, y_temp = train_test_split(
        X_processed, y, test_size=0.30, random_state=42, stratify=y
    )

    X_test, X_val, y_test, y_val = train_test_split(
        X_temp, y_temp, test_size=1 / 3, random_state=42, stratify=y_temp
    )
    
    # 9) Print final dataset shapes
    print("Train shape:", X_train.shape)
    print("Test shape:", X_test.shape)
    print("Validation shape:", X_val.shape)
    
    # Save datasets
    import numpy as np
    np.savez_compressed(
        "processed_data.npz",
        X_train=X_train,
        X_test=X_test,
        X_val=X_val,
        y_train=y_train,
        y_test=y_test,
        y_val=y_val
    )
    print("\nProcessed data saved as processed_data.npz")
else:
    X_train, X_temp = train_test_split(
        X_processed, test_size=0.30, random_state=42
    )

    X_test, X_val = train_test_split(
        X_temp, test_size=1 / 3, random_state=42
    )
    
    print("Train shape:", X_train.shape)
    print("Test shape:", X_test.shape)
    print("Validation shape:", X_val.shape)
    
    # Save datasets without labels
    np.savez_compressed(
        "processed_data.npz",
        X_train=X_train,
        X_test=X_test,
        X_val=X_val
    )
    print("\nProcessed data saved as processed_data.npz")
