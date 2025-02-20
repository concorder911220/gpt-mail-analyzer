import axios from "axios";
import { config } from "dotenv";
import fs from "fs";
import cron from "node-cron";
import { saveToGoogleSheet } from "./utils/googleSheetFunc.js";
import { analyzeEmail } from "./utils/analyzeEmail.js";
import { processPdf } from "./utils/processPdf.js";
import { getAttachments } from "./utils/getAttachements.js";

config();

const { CLIENT_ID, CLIENT_SECRET, TENANT_ID, SHARED_MAILBOX } = process.env;

const LAST_CHECKED_FILE = "last_checked.txt";

function getLastCheckedTime() {
  return fs.existsSync(LAST_CHECKED_FILE)
    ? fs.readFileSync(LAST_CHECKED_FILE, "utf-8")
    : null;
}

function updateLastCheckedTime(timestamp) {
  fs.writeFileSync(LAST_CHECKED_FILE, timestamp);
}

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

  let lastChecked = getLastCheckedTime();
  let query = lastChecked
    ? `?$filter=receivedDateTime gt ${lastChecked}&$orderby=receivedDateTime asc`
    : "?$orderby=receivedDateTime asc";
  updateLastCheckedTime(new Date().toISOString());

  try {
    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${SHARED_MAILBOX}/messages?${query}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const emails = response.data.value;

    // const emails = mock_response;
    console.log(
      `✅ Successfully connected to ${SHARED_MAILBOX}. Latest emails`
    );

    if (emails.length === 0) {
      console.log("✅ No new emails.");
      return;
    }

    for (const email of emails) {
      console.log(
        `- 📧 From: ${email.from.emailAddress.address}, Subject: ${email.subject}`
      );
      let allImagePaths = [];

      if (email.hasAttachments) {
        console.log("📎 Email has attachments. Fetching...");
        const attachments = await getAttachments(email.id, token);

        for (const filePath of attachments) {
          if (filePath.endsWith(".pdf")) {
            const images = await processPdf(filePath);
            allImagePaths.push(...images);
          } else if (filePath.match(/\.(png|jpg|jpeg)$/i)) {
            allImagePaths.push(filePath);
          }
        }
      }

      const extractedData = await analyzeEmail(
        email.body.content,
        allImagePaths
      );

      if (extractedData && extractedData.product_details.length > 0) {
        extractedData.product_details.map(async (item) => {
          await saveToGoogleSheet(item, extractedData.vender_name, email);
        });
      }
    }
  } catch (error) {
    console.error(
      "❌ Error fetching emails:",
      error.response?.data || error.message
    );
  }
}

// Run fetchEmails() immediately on startup
(async () => {
  console.log("🚀 Running initial email check...");
  await fetchEmails();
})();

// Then schedule it to run every hour
cron.schedule("0 * * * *", async () => {
  console.log("⏳ Checking for new emails...");
  await fetchEmails();
});
