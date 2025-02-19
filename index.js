require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Load environment variables
const { CLIENT_ID, CLIENT_SECRET, TENANT_ID, SHARED_MAILBOX } = process.env;

// Microsoft OAuth2 Token URL
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

// Get OAuth2 Token
async function getAccessToken() {
  try {
    const response = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      })
    );

    return response.data.access_token;
  } catch (error) {
    console.error(
      "❌ Error getting access token:",
      error.response?.data || error.message
    );
    return null;
  }
}

// Get Emails from Shared Mailbox
async function fetchEmails() {
  const token = await getAccessToken();
  if (!token) return;

  try {
    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${SHARED_MAILBOX}/messages?$top=5`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const emails = response.data.value;
    console.log(
      `✅ Successfully connected to ${SHARED_MAILBOX}. Latest emails:`
    );

    for (const email of emails) {
      console.log(
        `- 📧 From: ${email.from.emailAddress.address}, Subject: ${email.subject}`
      );

      if (email.hasAttachments) {
        console.log("📎 Email has attachments. Fetching...");
        await getAttachments(email.id, token);
      }
    }
  } catch (error) {
    console.error(
      "❌ Error fetching emails:",
      error.response?.data || error.message
    );
  }
}

// Get Attachments for an Email
async function getAttachments(emailId, accessToken) {
  try {
    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${SHARED_MAILBOX}/messages/${emailId}/attachments`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const attachments = response.data.value;
    for (const attachment of attachments) {
      if (attachment["@odata.type"] === "#microsoft.graph.fileAttachment") {
        saveAttachment(attachment);
      }
    }
  } catch (error) {
    console.error(
      `❌ Failed to get attachments for email ${emailId}:`,
      error.response?.data || error.message
    );
  }
}

// Save Attachment to Local Storage
function saveAttachment(attachment) {
  const dir = "attachments";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  const filepath = path.join(dir, attachment.name);
  fs.writeFileSync(filepath, Buffer.from(attachment.contentBytes, "base64"));

  console.log(`📁 Saved attachment: ${attachment.name}`);
}

// Run the function
fetchEmails();
