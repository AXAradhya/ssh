"""
Synthetic data generator for GridGuard AI.
Generates 2 years of realistic hourly grid data.
"""
import numpy as np
import pandas as pd
from datetime import datetime, timedelta


import os

def generate_synthetic_dataset(years: int = 2) -> pd.DataFrame:
    """
    Generate dataset by loading real data from energy_dataset.csv.
    Extracts actual load and renewable generation, and mocks weather
    parameters so that the XGBoost model has the features it expects.
    """
    csv_path = r"C:\Users\adity\OneDrive\Desktop\Root Access\gridguard-ai\energy_dataset.csv"
    
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Cannot find dataset at {csv_path}")

    # Read the real dataset
    df_raw = pd.read_csv(csv_path)
    
    # Sort by time
    df_raw["timestamp"] = pd.to_datetime(df_raw["time"], utc=True)
    df_raw = df_raw.sort_values("timestamp")
    
    # We want approximately `years` worth of hourly data from the end
    hours = years * 365 * 24
    df_raw = df_raw.tail(hours).copy()
    
    df = pd.DataFrame()
    df["timestamp"] = df_raw["timestamp"].dt.tz_localize(None) # Remove tz for compatibility
    
    # Extract real data!
    df["load_mw"] = df_raw["total load actual"].bfill().fillna(400.0)
    df["solar_mw"] = df_raw["generation solar"].bfill().fillna(0.0)
    
    wind_on = df_raw["generation wind onshore"].fillna(0.0)
    wind_off = df_raw["generation wind offshore"].fillna(0.0)
    df["wind_mw"] = wind_on + wind_off

    # Time features
    df["hour"] = df["timestamp"].dt.hour
    df["month"] = df["timestamp"].dt.month
    df["day_of_week"] = df["timestamp"].dt.weekday
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    
    def is_hol(ts):
        return int((ts.month, ts.day) in {(1, 1), (7, 4), (12, 25), (12, 24), (11, 11), (1, 15), (2, 20)})
    df["is_holiday"] = df["timestamp"].apply(is_hol)

    # Impute missing weather features using vectorized logic so forecaster doesn't break
    np.random.seed(42)
    hour_arr = df["hour"].values
    month_arr = df["month"].values
    
    # Temperature
    base_temp = 20 + 10 * np.sin(2 * np.pi * (month_arr - 3) / 12)
    daily_temp_var = 5 * np.sin(2 * np.pi * (hour_arr - 6) / 24)
    df["temperature"] = np.round(base_temp + daily_temp_var + np.random.normal(0, 2, size=len(df)), 2)
    
    # Humidity
    humidity = 60 + 15 * np.sin(2 * np.pi * (month_arr - 7) / 12) + np.random.normal(0, 5, size=len(df))
    df["humidity"] = np.round(np.clip(humidity, 20, 95), 2)
    
    # Wind Speed
    wind_spd = 6 + 4 * np.sin(2 * np.pi * (month_arr - 1) / 12) + np.random.normal(0, 2, size=len(df))
    df["wind_speed"] = np.round(np.clip(wind_spd, 0, None), 2)
    
    # Solar Irradiance
    solar_angle = np.sin(np.pi * (hour_arr - 6) / 12)
    seasonal_factor = 0.6 + 0.4 * np.sin(2 * np.pi * (month_arr - 3) / 12)
    cloud_factor = np.random.uniform(0.5, 1.0, size=len(df))
    irr = 800 * solar_angle * seasonal_factor * cloud_factor
    irr = np.where((hour_arr >= 6) & (hour_arr <= 18), irr, 0.0)
    df["solar_irradiance"] = np.round(irr, 2)

    # Add autoregressive lag features required by forecaster
    df["load_lag_1h"] = df["load_mw"].shift(1).bfill()
    df["load_lag_24h"] = df["load_mw"].shift(24).bfill()
    df["load_lag_168h"] = df["load_mw"].shift(168).bfill()
    df["temp_lag_1h"] = df["temperature"].shift(1).bfill()
    df["load_rolling_24h_mean"] = df["load_mw"].rolling(24, min_periods=1).mean()

    return df.reset_index(drop=True)


def _is_holiday(dt: datetime) -> bool:
    """Simple holiday approximation: major US holidays. (Legacy function)"""
    md = (dt.month, dt.day)
    holidays = {
        (1, 1), (7, 4), (12, 25), (12, 24),
        (11, 11), (1, 15), (2, 20),
    }
    # Thanksgiving: 4th Thursday of November
    if dt.month == 11 and dt.weekday() == 3:
        thursdays = [(dt.replace(day=d).weekday() == 3) for d in range(1, 32) if d <= 30]
        nth = sum(1 for d in range(1, dt.day + 1) if dt.replace(day=d).weekday() == 3)
        if nth == 4:
            return True
    return md in holidays


FEATURE_COLUMNS = [
    "hour", "day_of_week", "month", "is_weekend", "is_holiday",
    "temperature", "humidity", "wind_speed", "solar_irradiance",
    "load_lag_1h", "load_lag_24h", "load_lag_168h",
    "temp_lag_1h", "load_rolling_24h_mean",
]
