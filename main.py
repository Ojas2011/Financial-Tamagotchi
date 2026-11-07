from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

START_BUDGET = 500.0
app_state = {
    "budget": START_BUDGET,
    "expenses": []
}

class Expense(BaseModel):
    name: str
    cost: float

@app.get("/")
def get_state():
    return app_state

@app.post("/expense")
def add_expense(expense: Expense):
    app_state["budget"] -= expense.cost
    app_state["budget"] = max(0, app_state["budget"])
    app_state["expenses"].append({"name": expense.name, "cost": expense.cost})
    return app_state

@app.post("/reset")
def reset_state():
    app_state["budget"] = START_BUDGET
    app_state["expenses"] = []
    return app_state

@app.get("/")
@app.get("/state")
def get_state():
    return app_state