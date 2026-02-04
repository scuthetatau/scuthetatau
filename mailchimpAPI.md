
# Mailchimp Points Sync Walkthrough

This guide explains how to use the Mailchimp Sync feature to push user points from Firebase to Mailchimp.

## Prerequisites

Set the following environment variables in your Vercel project (and locally in `.env` for testing):

- `MAILCHIMP_API_KEY`: Your Mailchimp API key
- `MAILCHIMP_SERVER_PREFIX`: The server prefix (for example, `us19`)
- `MAILCHIMP_AUDIENCE_ID`: The Audience ID (List ID) to sync to

In Mailchimp, ensure you have a merge field with the tag `POINTS` (type **Number**) created in your Audience settings.

## How to run the sync

### Using the API endpoint

The sync is an API endpoint that can be triggered via `curl` or Postman.

- **Endpoint:** `POST /api/sync-mailchimp`

**Example request:**
```
bash
curl -X POST https://your-site.com/api/sync-mailchimp
```
**Response:**

The API returns a JSON object with stats on how many users were scanned, updated, or failed.
```
json
{
"message": "Sync process completed",
"stats": {
"total_scanned": 150,
"successful_updates": 148,
"failed_updates": 2
}
}
```
### Using in newsletters

Once synced, you can use the `*|POINTS|*` merge tag in your Mailchimp campaigns to display the user’s points.

**Example:**

> "Hi |FNAME|, you currently have |POINTS| points!"

## Troubleshooting

- **401 Unauthorized:** Check your API key.
- **400 Bad Request:** Confirm the `POINTS` merge field exists in Mailchimp.
- **Timeout:** If you have more than 1000 users, the sync might time out on Vercel’s free tier (10s limit). Consider batching the sync or running it locally.
