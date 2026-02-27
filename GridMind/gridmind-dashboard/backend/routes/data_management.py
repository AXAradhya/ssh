from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import LoadData, Forecast, Intervention, Zone, Alert, DatasetMeta, GeminiInsight
from datetime import datetime
import csv
import io
import json

router = APIRouter(prefix="/api/data", tags=["Data Management"])


@router.get("/datasets")
def list_datasets(db: Session = Depends(get_db)):
    """List all uploaded datasets."""
    datasets = db.query(DatasetMeta).order_by(DatasetMeta.uploaded_at.desc()).all()
    return {
        "datasets": [{
            "id": d.id,
            "name": d.name,
            "rows": d.rows,
            "dateRangeStart": str(d.date_range_start) if d.date_range_start else None,
            "dateRangeEnd": str(d.date_range_end) if d.date_range_end else None,
            "source": d.source,
            "uploadedAt": d.uploaded_at.isoformat(),
            "description": d.description,
        } for d in datasets]
    }


@router.get("/stats")
def get_db_stats(db: Session = Depends(get_db)):
    """Get database statistics."""
    return {
        "loadRecords": db.query(func.count(LoadData.id)).scalar() or 0,
        "forecastRecords": db.query(func.count(Forecast.id)).scalar() or 0,
        "interventions": db.query(func.count(Intervention.id)).scalar() or 0,
        "zones": db.query(func.count(Zone.id)).scalar() or 0,
        "alerts": db.query(func.count(Alert.id)).scalar() or 0,
        "datasets": db.query(func.count(DatasetMeta.id)).scalar() or 0,
    }


@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a CSV dataset with Gemini-powered analysis."""
    if not file.filename.endswith('.csv'):
        return {"status": "error", "message": "Only CSV files are supported."}

    content = await file.read()
    if len(content) == 0:
        return {"status": "error", "message": "File is empty."}

    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        return {"status": "error", "message": "File encoding not supported. Use UTF-8."}

    reader = csv.DictReader(io.StringIO(text))

    rows_added = 0
    first_date = None
    last_date = None
    all_demands = []
    sample_rows = []

    for row in reader:
        try:
            ts_str = row.get("timestamp") or row.get("datetime") or row.get("date")
            demand = row.get("demand_mw") or row.get("load_value") or row.get("value") or row.get("demand")

            if not ts_str or not demand:
                continue

            ts = None
            for fmt in ["%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%d-%m-%Y %H:%M:%S", "%d-%m-%Y %H:%M",
                        "%Y-%m-%dT%H:%M:%S", "%d/%m/%Y %H:%M", "%m/%d/%Y %H:%M"]:
                try:
                    ts = datetime.strptime(ts_str.strip(), fmt)
                    break
                except ValueError:
                    continue

            if not ts:
                continue

            demand_val = float(demand)
            all_demands.append(demand_val)

            if rows_added < 5:
                sample_rows.append(dict(row))

            if first_date is None:
                first_date = ts.date()
            last_date = ts.date()

            industrial = float(row.get("industrial_mw", 0) or 0)
            residential = float(row.get("residential_mw", 0) or 0)
            if industrial == 0 and residential == 0:
                h = ts.hour
                industrial = demand_val * (0.55 if 9 <= h < 18 else 0.25)
                residential = demand_val - industrial

            db.add(LoadData(
                timestamp=ts, date=ts.date(), time=ts.time(),
                demand_mw=demand_val,
                industrial_mw=round(industrial),
                residential_mw=round(residential),
                temperature_c=float(row.get("temperature_c", 0) or 0) or None,
                is_holiday=False, day_type="weekday",
            ))
            rows_added += 1
        except Exception:
            continue

    # Save dataset metadata
    ds = DatasetMeta(
        name=file.filename, rows=rows_added,
        date_range_start=first_date, date_range_end=last_date,
        source="csv_upload",
        description=f"Uploaded CSV: {file.filename}",
    )
    db.add(ds)
    db.commit()
    db.refresh(ds)

    # --- Gemini Analysis ---
    gemini_result = None
    if rows_added > 0:
        try:
            from gemini_service import analyze_csv_data
            csv_summary = {
                "filename": file.filename,
                "total_rows": rows_added,
                "columns": list(reader.fieldnames) if reader.fieldnames else [],
                "date_range": f"{first_date} to {last_date}" if first_date else "N/A",
                "avg_demand": round(sum(all_demands) / len(all_demands), 1) if all_demands else 0,
                "peak_demand": round(max(all_demands), 1) if all_demands else 0,
                "min_demand": round(min(all_demands), 1) if all_demands else 0,
            }
            gemini_result = analyze_csv_data(csv_summary, sample_rows)

            # Store insight in DB
            insight = GeminiInsight(
                dataset_id=ds.id,
                insight_type="csv_analysis",
                summary=gemini_result.get("summary", "Analysis completed"),
                details=json.dumps(gemini_result, default=str),
                risk_level=gemini_result.get("risk_level", "unknown"),
            )
            db.add(insight)
            db.commit()
        except Exception as e:
            gemini_result = {"error": str(e)}

    return {
        "status": "success",
        "filename": file.filename,
        "rowsAdded": rows_added,
        "dateRange": f"{first_date} to {last_date}" if first_date else "—",
        "analysis": gemini_result,
    }


@router.delete("/clear")
def clear_and_reseed(db: Session = Depends(get_db)):
    """Clear all data and re-seed with defaults."""
    from seed_data import seed_all
    seed_all()
    return {"status": "success", "message": "Database cleared and re-seeded."}


@router.delete("/dataset/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    """Delete a dataset record."""
    record = db.query(DatasetMeta).filter(DatasetMeta.id == dataset_id).first()
    if record:
        db.delete(record)
        db.commit()
        return {"status": "deleted", "id": dataset_id}
    return {"status": "not_found"}
