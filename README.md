# finance-tracker-app

This app will allow users to keep track of how much money they're spending and set limits across all their money sources, including credit and debit cards, Venmo, and cash transactions.

Goals:
- Set limits, see what % of monthly limit they've spent, see how much they spent in time range, etc.
- Show different tabs for the different banks user link from Plaid. Include an "All" tab that shows all accounts.
- Include Venmo transaction history. Ideally, use Venmo API. If this doesn't work, consider a Zapier workflow that runs everytime user receives an email from Venmo.

Stretch goals:
- This might be a big enough idea to be its own project entirely, but it would be cool to have analytics performed on the credit card data and recommended credit cards based on spending habits
  - This would involve analyzing data about credit cards (such as APR, sign-up fees, percentages back, points, etc.) from online and making a recommendation. This could be a good opportunity to try using some machine learning or predictive analytics.
 
See https://github.com/plaid/pattern/ for a good example of how I should structure my README in an easily understandable way that explains all the different parts of the stack: frontend (React), backend (Python FastAPI), database (PostgreSQL through Supabase), webhooks (TBD - maybe ngrok), and container orchestration (Docker).
