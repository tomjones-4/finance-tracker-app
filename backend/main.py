from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from plaid_routes.routes import router as plaid_router
from supabase_client import supabase

app = FastAPI()

origins = [
    "http://localhost:5173",  # React frontend default port
    "http://localhost:5174",  # React frontend default port
    "http://localhost:5175",  # React frontend default port
    "http://localhost:3000",  # Another common React port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(plaid_router, prefix="/plaid")

@app.get("/")
async def read_root():
    return {"message": "Welcome to the Finance Tracker API!"}

@app.get("/test-supabase")
async def test_supabase():
    try:
        response = supabase.from_("users").select("*").limit(1).execute()
        return {"message": "Supabase connection successful", "data": response.data}
    except Exception as e:
        return {"message": "Supabase connection failed", "error": str(e)}
