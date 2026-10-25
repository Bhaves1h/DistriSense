import datetime
from sqlalchemy import Column, String, Integer, Float, Date, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base

class SKU(Base):
    __tablename__ = "sku"
    id = Column(String, primary_key=True)  # SKU-001 ...
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)  # Snacks, Beverages, Dairy, Personal Care, Home Care, Staples
    unit_cost = Column(Float, nullable=False)
    mrp = Column(Float, nullable=False)
    shelf_life_days = Column(Integer, nullable=False)
    supplier_lead_time_days = Column(Integer, nullable=False, default=3)

class Node(Base):
    __tablename__ = "node"
    id = Column(String, primary_key=True)  # W-A, W-B, W-C, SHOP-01 ...
    type = Column(String, nullable=False)  # warehouse, outlet
    name = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)

class StockBatch(Base):
    __tablename__ = "stock_batch"
    id = Column(String, primary_key=True)
    sku_id = Column(String, ForeignKey("sku.id"), nullable=False, index=True)
    node_id = Column(String, ForeignKey("node.id"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    expiry_date = Column(Date, nullable=False)
    received_date = Column(Date, nullable=False)

class SalesDaily(Base):
    __tablename__ = "sales_daily"
    id = Column(Integer, primary_key=True, autoincrement=True)
    sku_id = Column(String, ForeignKey("sku.id"), nullable=False, index=True)
    node_id = Column(String, ForeignKey("node.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    units_sold = Column(Integer, nullable=False)

class StockObservation(Base):
    __tablename__ = "stock_observation"
    id = Column(Integer, primary_key=True, autoincrement=True)
    sku_id = Column(String, ForeignKey("sku.id"), nullable=False, index=True)
    node_id = Column(String, ForeignKey("node.id"), nullable=False, index=True)
    observed_date = Column(Date, nullable=False)
    counted_units = Column(Integer, nullable=False)
    source = Column(String, nullable=False, default="visit")  # visit, app

class EventCalendar(Base):
    __tablename__ = "event_calendar"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    demand_multiplier = Column(Float, nullable=False, default=1.0)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

class Forecast(Base):
    __tablename__ = "forecast"
    id = Column(Integer, primary_key=True, autoincrement=True)
    sku_id = Column(String, ForeignKey("sku.id"), nullable=False, index=True)
    node_id = Column(String, ForeignKey("node.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    forecast_units = Column(Float, nullable=False)
    base_avg = Column(Float, nullable=False)
    dow_factor = Column(Float, nullable=False)
    event_factor = Column(Float, nullable=False)
    trend_factor = Column(Float, nullable=False)

class RiskFlag(Base):
    __tablename__ = "risk_flag"
    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String, nullable=False, index=True)
    sku_id = Column(String, ForeignKey("sku.id"), nullable=False)
    node_id = Column(String, ForeignKey("node.id"), nullable=False)
    type = Column(String, nullable=False)  # stockout, expiry
    days_of_cover = Column(Float, nullable=False)
    prob_stockout = Column(Float, nullable=True)
    reason_codes = Column(JSON, nullable=False)
    rupee_at_risk = Column(Float, nullable=False)

class Recommendation(Base):
    __tablename__ = "recommendation"
    id = Column(String, primary_key=True)  # rec_...
    run_id = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False)  # transfer, reorder, markdown
    sku_id = Column(String, ForeignKey("sku.id"), nullable=False)
    from_node_id = Column(String, nullable=False)
    to_node_id = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    reason_codes = Column(JSON, nullable=False)
    explanation = Column(Text, nullable=False)
    status = Column(String, nullable=False, default="pending")  # pending, approved, edited, dismissed
    source_before = Column(Integer, nullable=True)
    source_after = Column(Integer, nullable=True)
    prob_stockout = Column(Float, nullable=True)
    rupee_at_risk = Column(Float, nullable=True)
    confidence = Column(String, default="high")
    days_to_expiry = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class DispatchTask(Base):
    __tablename__ = "dispatch_task"
    id = Column(String, primary_key=True)  # task_...
    recommendation_id = Column(String, ForeignKey("recommendation.id"), nullable=False)
    batch_id = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="pending")  # pending, completed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, autoincrement=True)
    actor = Column(String, nullable=False)
    action = Column(String, nullable=False)
    entity = Column(String, nullable=False)
    before_state = Column(Text, nullable=True)
    after_state = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Run(Base):
    __tablename__ = "run"
    id = Column(String, primary_key=True)  # YYYY-MM-DD-HHMM
    started_at = Column(DateTime, nullable=False)
    finished_at = Column(DateTime, nullable=True)
    status = Column(String, nullable=False)  # running, succeeded, failed
    counts = Column(JSON, nullable=True)

class SimulationRun(Base):
    __tablename__ = "simulation_run"
    id = Column(String, primary_key=True)
    scenario = Column(String, nullable=False)
    params = Column(JSON, nullable=False)
    seed_set = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class SimulationResult(Base):
    __tablename__ = "simulation_result"
    id = Column(Integer, primary_key=True, autoincrement=True)
    simulation_run_id = Column(String, ForeignKey("simulation_run.id"), nullable=False)
    arm = Column(String, nullable=False)  # donothing, baseline, distrisense
    events = Column(Integer, nullable=False)
    lost_units = Column(Integer, nullable=False)
    writeoffs = Column(Integer, nullable=False)
    avg_inventory = Column(Float, nullable=False)
    net_rupee = Column(Float, nullable=False)
