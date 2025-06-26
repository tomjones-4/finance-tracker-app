from fastapi import APIRouter
from plaid.client import plaid_client

router = APIRouter()

@router.post("/create_link_token")
def create_link_token():
    response = plaid_client.LinkToken.create({
        "user": {"client_user_id": "placeholder-id"},
        "client_name": "Finance Tracker",
        "products": ["transactions"],
        "country_codes": ["US"],
        "language": "en"
    })
    return response

@router.post("/exchange_public_token")
def exchange_token(public_token: str):
    exchange_response = plaid_client.Item.public_token.exchange(public_token)
    access_token = exchange_response['access_token']
    item_id = exchange_response['item_id']
    return {"access_token": access_token, "item_id": item_id}
