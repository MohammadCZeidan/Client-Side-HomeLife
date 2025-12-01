# n8n Workflows for HomeLife

This directory contains three automated workflows for the HomeLife application:

## Workflows

### WF1: Daily Expiry Alerts
**Schedule:** Daily at 9:00 AM  
**Purpose:** Sends notifications about pantry items expiring within 7 days

**Features:**
- Fetches expiring items from `/pantry/expiring?days=7`
- Groups items by urgency (expired, tomorrow, this week, next week)
- Sends notifications via Email, Telegram, and/or Slack

### WF2: Weekly Meal Plan Draft
**Schedule:** Every Monday at 10:00 AM  
**Purpose:** Automatically generates a weekly meal plan using AI

**Features:**
- Calculates next Monday's date
- Fetches current pantry items and available recipes
- Uses OpenAI to generate meal suggestions based on available ingredients
- Creates meal plan via API and adds suggested meals

### WF3: Shopping List Auto-Update
**Trigger:** Webhook (called when meal plan is updated)  
**Purpose:** Automatically regenerates shopping list when meal plan changes

**Features:**
- Receives webhook from your app when meal plan is updated
- Generates shopping list from meal plan
- Sends notifications to users about the updated list

## Installation

### Prerequisites
1. n8n installed and running (see [n8n installation guide](https://docs.n8n.io/getting-started/installation/))
2. API access token for your HomeLife backend
3. (Optional) OpenAI API key for WF2
4. (Optional) Email/SMTP credentials for notifications
5. (Optional) Telegram bot token and chat ID for notifications
6. (Optional) Slack webhook URL for notifications

### Setup Steps

1. **Import Workflows into n8n:**
   - Open n8n UI (usually `http://localhost:5678`)
   - Click "Workflows" → "Import from File"
   - Import each JSON file:
     - `WF1-Daily-Expiry-Alerts.json`
     - `WF2-Weekly-Meal-Plan-Draft.json`
     - `WF3-Shopping-List-Auto-Update.json`

2. **Configure Environment Variables:**
   
   Set these in n8n's environment variables or workflow settings:
   
   ```bash
   # Required
   API_BASE_URL=http://127.0.0.1:8000/api/v0.1
   API_TOKEN=your_jwt_token_here
   
   # Optional - Email (for WF1 and WF3)
   EMAIL_FROM=noreply@homelife.app
   EMAIL_TO=user@example.com
   
   # Optional - Telegram (for WF1 and WF3)
   TELEGRAM_CHAT_ID=your_chat_id
   
   # Optional - Slack (for WF1 and WF3)
   SLACK_CHANNEL=#notifications
   
   # Optional - OpenAI (for WF2)
   OPENAI_MODEL=gpt-4
   ```

3. **Set Up Credentials in n8n:**
   
   For each workflow, configure the required credentials:
   
   - **SMTP (Email):** Settings → Credentials → Add SMTP credentials
   - **Telegram:** Settings → Credentials → Add Telegram Bot API credentials
   - **Slack:** Settings → Credentials → Add Slack API credentials
   - **OpenAI:** Settings → Credentials → Add OpenAI API credentials
   - **HTTP Header Auth:** Create a generic credential with:
     - Name: `Authorization`
     - Value: `Bearer ${API_TOKEN}` (use expression)

4. **Get Webhook URL for WF3:**
   - After importing WF3, activate the workflow
   - Copy the webhook URL (e.g., `https://your-n8n-instance.com/webhook/meal-plan-updated`)
   - Add this webhook call to your backend when meal plans are updated

## Backend Integration

### Adding Webhook to Your Backend

To trigger WF3 when a meal plan is updated, add this to your Laravel backend:

```php
// In your MealPlanController or service
use Illuminate\Support\Facades\Http;

public function updateMealPlan($planId) {
    // ... your existing update logic ...
    
    // Trigger n8n webhook
    try {
        Http::post(env('N8N_WEBHOOK_URL'), [
            'planId' => $planId,
            'weekId' => $planId, // or actual week ID
            'title' => 'Weekly Shopping List',
            'householdId' => auth()->user()->household_id
        ]);
    } catch (\Exception $e) {
        \Log::warning('Failed to trigger shopping list webhook: ' . $e->getMessage());
    }
    
    return response()->json(['status' => 'success']);
}
```

Add to your `.env`:
```env
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/meal-plan-updated
```

## Customization

### Changing Schedule Times

**WF1 (Daily Expiry Alerts):**
- Edit the Cron node: `Daily at 9 AM`
- Change expression: `0 9 * * *` (9 AM daily)
- Format: `minute hour day month weekday`

**WF2 (Weekly Meal Plan):**
- Edit the Cron node: `Every Monday at 10 AM`
- Change expression: `0 10 * * 1` (10 AM every Monday)
- `1` = Monday, `0` = Sunday

### Adjusting Expiry Days

In WF1, change the `days` parameter in "Fetch Expiring Items" node:
- Current: `7` (7 days)
- Change to: `3`, `14`, etc.

### Modifying Notification Channels

To disable a notification channel:
1. Open the workflow
2. Delete or disable the node (Email/Telegram/Slack)
3. Remove the connection from "Format Message" node

To add more channels:
1. Add a new notification node (e.g., Discord, Microsoft Teams)
2. Connect it from "Format Message" node

## Testing

### Test WF1 (Daily Expiry Alerts)
1. Ensure you have pantry items with expiry dates
2. Manually trigger the workflow
3. Check notifications are sent

### Test WF2 (Weekly Meal Plan)
1. Ensure you have recipes and pantry items
2. Manually trigger the workflow
3. Check that meal plan is created in your app
4. Verify meals are added correctly

### Test WF3 (Shopping List Auto-Update)
1. Get the webhook URL from n8n
2. Send a test POST request:
   ```bash
   curl -X POST https://your-n8n-instance.com/webhook/meal-plan-updated \
     -H "Content-Type: application/json" \
     -d '{"planId": "1", "weekId": "1", "title": "Test List"}'
   ```
3. Check that shopping list is generated and notifications sent

## Troubleshooting

### Workflow Not Running
- Check workflow is **activated** (toggle in top-right)
- Verify cron expressions are correct
- Check n8n execution logs

### API Errors
- Verify `API_TOKEN` is valid and not expired
- Check `API_BASE_URL` is correct
- Ensure backend is running and accessible

### OpenAI Errors (WF2)
- Verify OpenAI API key is valid
- Check you have credits/quota available
- Try a different model (e.g., `gpt-3.5-turbo`)

### Webhook Not Triggering (WF3)
- Verify webhook URL is correct in backend
- Check n8n workflow is activated
- Test webhook URL directly with curl/Postman
- Check n8n execution logs for incoming requests

### Notifications Not Sending
- Verify credentials are configured correctly
- Check email addresses/chat IDs are correct
- Test credentials separately (send test email, etc.)

## Security Notes

- **API Token:** Store securely, rotate regularly
- **Webhook URL:** Consider adding authentication/secret
- **Environment Variables:** Don't commit sensitive data
- **n8n Access:** Secure your n8n instance with authentication

## Support

For issues or questions:
1. Check n8n execution logs
2. Review workflow node error messages
3. Verify API endpoints are working (test with Postman/curl)
4. Check n8n documentation: https://docs.n8n.io/

