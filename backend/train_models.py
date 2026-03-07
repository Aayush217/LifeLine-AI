import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBRegressor
import joblib
import os

# Create a folder for the models if it doesn't exist
os.makedirs('app/ml_models', exist_ok=True)

print("Starting Data Pipeline...")

np.random.seed(42)
n_samples = 1500

data = {
    'Recency_Months': np.random.randint(1, 48, n_samples),
    'Frequency_Times': np.random.randint(1, 50, n_samples),
    'Monetary_cc': np.random.randint(250, 12500, n_samples),
    'Time_Months': np.random.randint(2, 98, n_samples),
    'Accident_Risk': np.random.randint(1, 11, n_samples), # 1-10 scale
    'Weather_Severity': np.random.randint(1, 6, n_samples), # 1-5 scale
    'Is_Weekend': np.random.choice([0, 1], n_samples, p=[0.71, 0.29])
}

df = pd.DataFrame(data)

# Target 1: Will there be a Shortage? (Classification)
# Using a slightly simpler logical array assignment to avoid pandas Warning
df['Target_Shortage'] = np.where(
    ((df['Accident_Risk'] > 7) & (df['Is_Weekend'] == 1)) | (df['Weather_Severity'] > 4), 
    1, 0
)

noise = np.random.normal(0, 5, n_samples)
df['Target_Units_Needed'] = (df['Accident_Risk'] * 5) + (df['Weather_Severity'] * 3) + noise
df['Target_Units_Needed'] = df['Target_Units_Needed'].clip(lower=0).astype(int)

X = df.drop(['Target_Shortage', 'Target_Units_Needed'], axis=1)
y_clf = df['Target_Shortage']

X_train, X_test, y_train_clf, y_test_clf = train_test_split(X, y_clf, test_size=0.2, random_state=42)

clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train, y_train_clf)
clf_score = clf.score(X_test, y_test_clf)
print(f"Classification Model Accuracy: {clf_score:.2f}")

y_reg = df['Target_Units_Needed']
X_train_r, X_test_r, y_train_reg, y_test_reg = train_test_split(X, y_reg, test_size=0.2, random_state=42)

reg = XGBRegressor(objective='reg:squarederror', n_estimators=100, random_state=42)
reg.fit(X_train_r, y_train_reg)
reg_score = reg.score(X_test_r, y_test_reg)
print(f"Regression Model R2 Score: {reg_score:.2f}")

joblib.dump(clf, 'app/ml_models/shortage_classifier.pkl')
joblib.dump(reg, 'app/ml_models/units_regressor.pkl')

print("Pipeline Complete. Models saved to app/ml_models/")
