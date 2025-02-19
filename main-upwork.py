import requests
import os
import base64

# Microsoft OAuth2 credentials
CLIENT_ID = ""
CLIENT_SECRET = ""
TENANT_ID = ""
SHARED_MAILBOX = ""

# Microsoft OAuth2 token endpoint
TOKEN_URL = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"

# Get OAuth2 Token
def get_access_token():
    payload = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "scope": "https://graph.microsoft.com/.default",
        "grant_type": "client_credentials"
    }
    
    response = requests.post(TOKEN_URL, data=payload)
    response.raise_for_status()  # Raise error if request fails
    return response.json()["access_token"]

# Get Attachments for a given Email ID
def get_attachments(email_id, access_token):
    url = f"https://graph.microsoft.com/v1.0/users/{SHARED_MAILBOX}/messages/{email_id}/attachments"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json"
    }

    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        attachments = response.json().get("value", [])
        for attachment in attachments:
            if attachment["@odata.type"] == "#microsoft.graph.fileAttachment":  # Only download file attachments
                save_attachment(attachment)
    else:
        print(f"❌ Failed to get attachments for email {email_id}. Response: {response.text}")

# Save Attachment to Local Storage
def save_attachment(attachment):
    filename = attachment["name"]
    content_bytes = attachment["contentBytes"]  # This is Base64 encoded

    # Ensure the directory exists
    os.makedirs("attachments", exist_ok=True)
    filepath = os.path.join("attachments", filename)

    # Decode Base64 and write as binary
    with open(filepath, "wb") as f:
        f.write(base64.b64decode(content_bytes))  # <-- Decode base64 before writing

    print(f"📁 Saved attachment: {filename}")

# Check Shared Mailbox Emails
def check_shared_mailbox():
    access_token = get_access_token()
    
    url = f"https://graph.microsoft.com/v1.0/users/{SHARED_MAILBOX}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json"
    }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        emails = response.json()["value"]
        print(f"✅ Successfully connected to {SHARED_MAILBOX}. Latest emails:")
        
        for email in emails[:5]:  # Check first 5 emails
            print(f"- From: {email['from']['emailAddress']['address']}, Subject: {email['subject']}")
            
            # If the email has attachments, fetch them
            if email.get("hasAttachments", False):
                print("📎 This email has attachments. Fetching...")
                get_attachments(email["id"], access_token)
    
    else:
        print(f"❌ Failed to access mailbox. Status Code: {response.status_code}, Response: {response.text}")

# Run the function
check_shared_mailbox()
