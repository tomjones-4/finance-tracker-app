from fastapi import FastAPI
from plaid.routes import router as plaid_router

app = FastAPI()
app.include_router(plaid_router, prefix="/plaid")
