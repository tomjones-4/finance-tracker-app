# TODO: Deal with this error when linking banks (from line 212):
# An unexpected error occurred during transaction sync: Invalid type for variable 'cursor'. Required value type is str and passed type was NoneType at ['cursor']

from fastapi import APIRouter, Request, HTTPException, Depends
from plaid_routes.client import client
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import (
    ItemPublicTokenExchangeRequest,
)
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.institutions_get_by_id_request import InstitutionsGetByIdRequest
from plaid.model.webhook_verification_key_get_request import (
    WebhookVerificationKeyGetRequest,
)
from plaid.model.webhook_verification_key_get_response import (
    WebhookVerificationKeyGetResponse,
)
from plaid.model.country_code import CountryCode
from plaid.model.products import Products
from plaid import ApiException
from datetime import date, timedelta
import json
import os
from typing import Dict, Any

from supabase_client import supabase
from config import PLAID_ENV

router = APIRouter()


# Dependency to get the current user from Supabase
async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    token = auth_header.split(" ")[1]
    try:
        user_response = supabase.auth.get_user(token)
        if user_response.user:
            return user_response.user
        else:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {e}")


@router.post("/create_link_token")
async def create_link_token(user: Any = Depends(get_current_user)):
    try:
        print("Creating link token for user:", user.id)
        request = LinkTokenCreateRequest(
            user=LinkTokenCreateRequestUser(client_user_id=str(user.id)),
            client_name="Finance Tracker",
            products=[Products("auth"), Products("transactions")],
            country_codes=[CountryCode("US")],
            language="en",
            redirect_uri="http://localhost:5173/oauth-redirect",  # Update with your frontend redirect URI
            webhook="http://localhost:8000/plaid/webhook",  # Update with your webhook URL
        )
        response = client.link_token_create(request)
        return response.to_dict()
    except ApiException as e:
        print(f"Plaid error: {e.body}")
        raise HTTPException(
            status_code=e.status,
            detail=json.loads(e.body)["display_message"] or e.reason,
        )


@router.post("/exchange_public_token")
async def exchange_public_token(
    public_token_data: Dict[str, str], user: Any = Depends(get_current_user)
):
    print("Creating link token for user:", user.id)
    print("Public token data received:", public_token_data)
    public_token = public_token_data.get("public_token")
    if not public_token:
        raise HTTPException(status_code=400, detail="Public token is required")

    try:
        exchange_request = ItemPublicTokenExchangeRequest(public_token=public_token)
        exchange_response = client.item_public_token_exchange(exchange_request)
        access_token = exchange_response.access_token
        item_id = exchange_response.item_id

        # Get institution details
        item_response = client.item_get({"access_token": access_token})
        institution_id = item_response.item.institution_id
        institution_name = None
        if institution_id:
            institution_request = InstitutionsGetByIdRequest(
                institution_id=institution_id, country_codes=[CountryCode("US")]
            )
            institution_response = client.institutions_get_by_id(institution_request)
            institution_name = institution_response.institution.name

        # Store access_token and item_id in Supabase
        plaid_item_data = {
            "user_id": str(user.id),
            "item_id": item_id,
            "access_token": access_token,
            "institution_id": institution_id,
            "institution_name": institution_name,
            "status": "good",
        }

        response = supabase.from_("plaid_items").insert(plaid_item_data).execute()
        if response.data:
            plaid_item_db_id = response.data[0]["id"]
            await sync_transactions(access_token, str(user.id), plaid_item_db_id)
            await sync_accounts(access_token, str(user.id), plaid_item_db_id)
            return {
                "message": "Public token exchanged and data synced successfully!",
                "item_id": item_id,
            }
        else:
            raise HTTPException(
                status_code=500, detail="Failed to save Plaid item to database."
            )

    except ApiException as e:
        print(f"Plaid error: {e.body}")
        raise HTTPException(
            status_code=e.status,
            detail=json.loads(e.body)["display_message"] or e.reason,
        )
    except Exception as e:
        print(f"An unexpected error occurred while exchanging public token: {e}")
        raise HTTPException(
            status_code=500, detail=f"An unexpected error occurred: {e}"
        )


async def sync_accounts(access_token: str, user_id: str, plaid_item_db_id: str):
    try:
        accounts_request = AccountsGetRequest(access_token=access_token)
        accounts_response = client.accounts_get(accounts_request)

        for account in accounts_response.accounts:
            account_data = {
                "user_id": user_id,
                "plaid_item_id": plaid_item_db_id,
                "account_id": account.account_id,
                "name": account.name,
                "official_name": account.official_name,
                "subtype": str(account.subtype.value) if account.subtype else None,
                "type": str(account.type.value) if account.type else None,
                "current_balance": account.balances.current,
                "available_balance": account.balances.available,
                "iso_currency_code": account.balances.iso_currency_code,
            }
            # Upsert account data
            supabase.from_("accounts").upsert(
                account_data, on_conflict="plaid_item_id, account_id"
            ).execute()
    except ApiException as e:
        print(f"Plaid error: {e.body}")
        print(f"Error syncing accounts: {json.loads(e.body)}")
    except Exception as e:
        print(f"An unexpected error occurred during account sync: {e}")


async def sync_transactions(access_token: str, user_id: str, plaid_item_db_id: str):
    added = []
    modified = []
    removed = []
    has_more = True
    cursor = None

    while has_more:
        try:
            request = TransactionsSyncRequest(
                access_token=access_token,
                cursor=cursor,
            )
            response = client.transactions_sync(request)

            # Add new transactions
            for transaction in response.added:
                account_response = (
                    supabase.from_("accounts")
                    .select("id")
                    .eq("account_id", transaction.account_id)
                    .eq("plaid_item_id", plaid_item_db_id)
                    .single()
                    .execute()
                )
                account_db_id = (
                    account_response.data["id"] if account_response.data else None
                )

                if account_db_id:
                    transaction_data = {
                        "user_id": user_id,
                        "account_id": account_db_id,
                        "transaction_id": transaction.transaction_id,
                        "source": "plaid",
                        "name": transaction.name,
                        "amount": transaction.amount,
                        "date": transaction.date.isoformat(),
                        "iso_currency_code": transaction.iso_currency_code,
                        "pending": transaction.pending,
                    }
                    supabase.from_("transactions").insert(transaction_data).execute()
                    added.append(transaction)

            # Update modified transactions
            for transaction in response.modified:
                account_response = (
                    supabase.from_("accounts")
                    .select("id")
                    .eq("account_id", transaction.account_id)
                    .eq("plaid_item_id", plaid_item_db_id)
                    .single()
                    .execute()
                )
                account_db_id = (
                    account_response.data["id"] if account_response.data else None
                )

                if account_db_id:
                    transaction_data = {
                        "user_id": user_id,
                        "account_id": account_db_id,
                        "transaction_id": transaction.transaction_id,
                        "source": "plaid",
                        "name": transaction.name,
                        "amount": transaction.amount,
                        "date": transaction.date.isoformat(),
                        "iso_currency_code": transaction.iso_currency_code,
                        "pending": transaction.pending,
                    }
                    supabase.from_("transactions").update(transaction_data).eq(
                        "transaction_id", transaction.transaction_id
                    ).execute()
                    modified.append(transaction)

            # Remove deleted transactions
            for transaction in response.removed:
                supabase.from_("transactions").delete().eq(
                    "transaction_id", transaction.transaction_id
                ).execute()
                removed.append(transaction)

            cursor = response.next_cursor
            has_more = response.has_more

        except ApiException as e:
            print(f"Plaid error: {e.body}")
            print(f"Error syncing transactions: {json.loads(e.body)}")
            break
        except Exception as e:
            print(f"An unexpected error occurred during transaction sync: {e}")
            break

    print(
        f"Synced transactions: Added {len(added)}, Modified {len(modified)}, Removed {len(removed)}"
    )


@router.post("/plaid_webhook")
async def plaid_webhook(request: Request):
    try:
        # Verify webhook signature (important for production)
        # For development, you might skip this or use a simplified check
        # webhook_secret = os.getenv("PLAID_WEBHOOK_SECRET")
        # if webhook_secret:
        #     PlaidClient.verify_webhook_signature(request.headers, request.json(), webhook_secret)

        webhook_data = await request.json()
        webhook_type = webhook_data.get("webhook_type")
        webhook_code = webhook_data.get("webhook_code")
        item_id = webhook_data.get("item_id")

        print(
            f"Received Plaid webhook: Type={webhook_type}, Code={webhook_code}, Item ID={item_id}"
        )

        # Retrieve access token and user_id from your database using item_id
        plaid_item_response = (
            supabase.from_("plaid_items")
            .select("access_token, user_id, id")
            .eq("item_id", item_id)
            .single()
            .execute()
        )
        if not plaid_item_response.data:
            raise HTTPException(
                status_code=404, detail="Plaid item not found in database"
            )

        access_token = plaid_item_response.data["access_token"]
        user_id = plaid_item_response.data["user_id"]
        plaid_item_db_id = plaid_item_response.data["id"]

        if webhook_type == "TRANSACTIONS":
            if webhook_code == "TRANSACTIONS_SYNC_UPDATES_AVAILABLE":
                await sync_transactions(access_token, user_id, plaid_item_db_id)
                return {"message": "Transactions sync initiated"}
            elif webhook_code == "HISTORICAL_UPDATE":
                await sync_transactions(access_token, user_id, plaid_item_db_id)
                return {"message": "Historical transactions sync initiated"}
            elif webhook_code == "DEFAULT_UPDATE":
                await sync_transactions(access_token, user_id, plaid_item_db_id)
                return {"message": "Default transactions sync initiated"}
            elif webhook_code == "INITIAL_UPDATE":
                await sync_transactions(access_token, user_id, plaid_item_db_id)
                return {"message": "Initial transactions sync initiated"}
            # Handle other transaction webhook codes as needed
        elif webhook_type == "ITEM":
            if webhook_code == "ERROR":
                error = webhook_data.get("error")
                # Update item status in DB to reflect error
                supabase.from_("plaid_items").update(
                    {"status": "error", "error_code": error.get("error_code")}
                ).eq("item_id", item_id).execute()
                return {"message": f"Item error: {error.get('error_code')}"}
            elif webhook_code == "PENDING_EXPIRATION":
                # Notify user to re-authenticate
                supabase.from_("plaid_items").update(
                    {"status": "pending_expiration"}
                ).eq("item_id", item_id).execute()
                return {"message": "Item pending expiration"}
            elif webhook_code == "WEBHOOK_UPDATE_ACKNOWLEDGED":
                # Webhook update acknowledged, no action needed
                return {"message": "Webhook update acknowledged"}
            # Handle other item webhook codes as needed

        return {
            "message": f"Webhook received: {webhook_type}. No specific action taken for this code: {webhook_code}"
        }

    except ApiException as e:
        print(f"Plaid error: {e.body}")
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {e}")
        raise e
    except Exception as e:
        print(f"An unexpected error occurred with Plaid webhook: {e}")


@router.get("/transactions")
async def get_transactions(user: Any = Depends(get_current_user)):
    try:
        response = (
            supabase.from_("transactions")
            .select("*")
            .eq("user_id", str(user.id))
            .order("date", desc=True)
            .execute()
        )
        return response.data
    except ApiException as e:
        print(f"Plaid error: {e.body}")
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch transactions: {e}"
        )


@router.get("/accounts")
async def get_accounts(user: Any = Depends(get_current_user)):
    try:
        response = (
            supabase.from_("accounts").select("*").eq("user_id", str(user.id)).execute()
        )
        return response.data
    except ApiException as e:
        print(f"Plaid error: {e.body}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch accounts: {e}")


@router.get("/plaid_items")
async def get_plaid_items(user: Any = Depends(get_current_user)):
    try:
        response = (
            supabase.from_("plaid_items")
            .select("*")
            .eq("user_id", str(user.id))
            .execute()
        )
        return response.data
    except ApiException as e:
        print(f"Plaid error: {e.body}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch Plaid items: {e}")
