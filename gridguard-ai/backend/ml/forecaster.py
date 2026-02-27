import os
import pandas as pd
import numpy as np
import xgboost as xgb
import shap
from datetime import datetime, timedelta
from typing import List, Dict

from .data_generator import generate_synthetic_dataset, FEATURE_COLUMNS, _is_holiday

PEAK_THRESHOLD_MW = 35000.0
MODEL_PATH = "xgboost_model.json"


class RealForecaster:
    def __init__(self):
        self.model = xgb.XGBRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=6,
            random_state=42
        )
        self.mae = 0.0
        self.rmse = 0.0
        self.explainer = None
        self._train_and_evaluate()

    def get_current_state(self) -> Dict:
        latest = self.df_history.iloc[-1]
        current_load = float(latest["load_mw"])
        solar_mw = float(latest["solar_mw"])
        wind_mw = float(latest["wind_mw"])
        temp = float(latest["temperature"])
        
        return {
            "current_load_mw": current_load,
            "solar_mw": solar_mw,
            "wind_mw": wind_mw,
            "renewable_mw": solar_mw + wind_mw,
            "temperature": temp
        }

    def _train_and_evaluate(self):
        print("Training XGBoost load forecaster on synthetic dataset...")
        df = generate_synthetic_dataset(years=2)
        
        X = df[FEATURE_COLUMNS]
        y = df["load_mw"]

        # Simple time-based train/test split (last 30 days for testing)
        split_idx = len(df) - (30 * 24)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

        self.model.fit(X_train, y_train)

        # Evaluate
        preds = self.model.predict(X_test)
        self.mae = np.mean(np.abs(preds - y_test))
        self.rmse = np.sqrt(np.mean((preds - y_test)**2))
        print(f"Model trained. MAE: {self.mae:.2f} MW, RMSE: {self.rmse:.2f} MW")

        # Initialize SHAP explainer
        self.explainer = shap.TreeExplainer(self.model)
        
        # Save historical dataframe state for rolling features
        self.df_history = df.tail(168).copy()

    def forecast(self, hours: int = 24, temp_delta: float = 0.0,
                 industrial_delta_pct: float = 0.0) -> List[Dict]:
        
        now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        
        # We need to build a future dataframe hour by hour to feed into the model
        future_records = []
        current_history = self.df_history.copy()
        
        for i in range(hours):
            ts = now + timedelta(hours=i)
            h = ts.hour
            month = ts.month
            dow = ts.weekday()
            is_weekend = int(dow >= 5)
            is_holiday = int(_is_holiday(ts))
            
            # Simple future weather estimates
            base_temp = 20 + 10 * np.sin(2 * np.pi * (month - 3) / 12)
            temp = base_temp + 5 * np.sin(2 * np.pi * (h - 6) / 24) + temp_delta
            
            hum = 60 + 15 * np.sin(2 * np.pi * (month - 7) / 12)
            wind = max(0, 6 + 4 * np.sin(2 * np.pi * (month - 1) / 12))
            
            solar = 0.0
            if 6 <= h <= 18:
                solar = 800 * np.sin(np.pi * (h - 6) / 12) * (0.6 + 0.4 * np.sin(2 * np.pi * (month - 3) / 12))

            # Lag features from history
            load_lag_1h = current_history.iloc[-1]["load_mw"]
            load_lag_24h = current_history.iloc[-24]["load_mw"] if len(current_history) >= 24 else load_lag_1h
            load_lag_168h = current_history.iloc[-168]["load_mw"] if len(current_history) >= 168 else load_lag_1h
            temp_lag_1h = current_history.iloc[-1]["temperature"]
            load_rolling_24h_mean = current_history["load_mw"].tail(24).mean()
            
            row = pd.DataFrame([{
                "hour": h, "day_of_week": dow, "month": month, 
                "is_weekend": is_weekend, "is_holiday": is_holiday,
                "temperature": temp, "humidity": hum, "wind_speed": wind, 
                "solar_irradiance": solar,
                "load_lag_1h": load_lag_1h, "load_lag_24h": load_lag_24h, 
                "load_lag_168h": load_lag_168h, "temp_lag_1h": temp_lag_1h, 
                "load_rolling_24h_mean": load_rolling_24h_mean
            }])

            # Predict load
            pred_load = float(self.model.predict(row[FEATURE_COLUMNS])[0])
            
            # Apply manual industrial adjustment if asked (simulator)
            if industrial_delta_pct != 0.0:
                 pred_load = pred_load * (1 + (industrial_delta_pct / 100))
                 
            # Add to temporal history so next hour can use it for lag features
            new_hist_row = row.copy()
            new_hist_row["load_mw"] = pred_load
            current_history = pd.concat([current_history, new_hist_row], ignore_index=True)
            
            # Compute renewables output (simplified matching data_generator scale)
            solar_mw = (solar / 800) * 50
            wind_mw = 30 + (wind / 10) * 15
            
            # Calculate standard error/confidence
            ci_bound = self.rmse * 1.96

            future_records.append({
                "timestamp": ts.isoformat() + "Z",
                "load_mw": round(pred_load, 2),
                "confidence_lower": round(pred_load - ci_bound, 2),
                "confidence_upper": round(pred_load + ci_bound, 2),
                "is_peak": pred_load > PEAK_THRESHOLD_MW,
                "solar_mw": round(solar_mw, 2),
                "wind_mw": round(wind_mw, 2),
                "temperature": round(temp, 2),
            })
            
            # Save the latest prediction for SHAP
            if i == 0:
                self.last_pred_row = row[FEATURE_COLUMNS]
                
        return future_records

    def get_shap_explanation(self) -> List[Dict]:
        if not hasattr(self, 'last_pred_row'):
            return []
            
        shap_values = self.explainer.shap_values(self.last_pred_row)
        vals = shap_values[0]
        
        features = []
        for i, f_name in enumerate(FEATURE_COLUMNS):
            val = float(vals[i])
            importance = abs(val)
            direction = "positive" if val > 0 else "negative"
            # Format feature name nicely
            display_name = f_name.replace("_", " ").title()
            
            desc = "Increases load demand" if direction == "positive" else "Decreases load demand"
            features.append({
                "feature": display_name,
                "importance": round(importance, 3),
                "direction": direction,
                "description": desc
            })
            
        # Sort by absolute importance (highest first)
        features.sort(key=lambda x: x["importance"], reverse=True)
        return features[:5]  # Top 5 most important features

    def detect_anomalies(self, recent_hours: int = 24) -> List[Dict]:
        if not hasattr(self, 'df_history') or len(self.df_history) < recent_hours:
            return []
            
        recent_data = self.df_history.tail(recent_hours)
        load = recent_data["load_mw"]
        
        mean_load = load.mean()
        std_load = load.std()
        
        if std_load == 0:
             return []
             
        z_scores = (load - mean_load) / std_load
        
        anomalies = []
        for idx in recent_data.index:
            z = z_scores.loc[idx]
            if abs(z) > 2.5: # Anomaly threshold
                timestamp = datetime.utcnow() - timedelta(hours=len(recent_data) - 1 - list(recent_data.index).index(idx))
                anomalies.append({
                    "timestamp": timestamp.isoformat() + "Z",
                    "load_mw": round(recent_data.loc[idx, "load_mw"], 2),
                    "z_score": round(z, 2),
                    "type": "spike" if z > 0 else "drop",
                    "severity": "high" if abs(z) > 3.0 else "medium"
                })
                
        return anomalies

_instance = None

def get_forecaster():
    global _instance
    if _instance is None:
        _instance = RealForecaster()
    return _instance
