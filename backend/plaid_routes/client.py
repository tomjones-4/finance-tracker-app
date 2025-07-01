import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import (
    ItemPublicTokenExchangeRequest,
)
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.webhook_verification_key_get_request import (
    WebhookVerificationKeyGetRequest,
)
from plaid.model.webhook_verification_key_get_response import (
    WebhookVerificationKeyGetResponse,
)
from datetime import date, timedelta

from config import PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV

# Configuration for Plaid
configuration = plaid.Configuration(
    # host=plaid.Environment[PLAID_ENV.upper()],
    host=plaid.Environment.Sandbox,  # Use Sandbox for testing
    api_key={
        "clientId": PLAID_CLIENT_ID,
        "secret": PLAID_SECRET,
    },
)

api_client = plaid.ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)
