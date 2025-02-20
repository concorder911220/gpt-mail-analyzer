import { google } from "googleapis";
import { config } from "dotenv";
config();

const serviceAccountKeyFile = "./config/google_sheets_api_key.json";
const sheetId = process.env.SHEET_ID;
const tabName = "Sheet1";
const range = "A:I";

export async function saveToGoogleSheet(item, vender_name, email) {
  // Generating google sheet client
  const googleSheetClient = await _getGoogleSheetClient();
  // Adding a new row to Google Sheet
  const dataToBeInserted = [
    [
      item.product_name || "",
      item.product_price || "",
      item.offer_terms || "",
      email?.from?.emailAddress?.address || "",
      email?.receivedDateTime || "",
      email?.subject || "",
      vender_name || "",
      `https://outlook.office.com/mail/inbox/id/${email?.id}`,
      new Date().toISOString(),
    ],
  ];
  await _writeGoogleSheet(
    googleSheetClient,
    sheetId,
    tabName,
    range,
    dataToBeInserted
  );
}

async function _getGoogleSheetClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: serviceAccountKeyFile,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const authClient = await auth.getClient();
  return google.sheets({
    version: "v4",
    auth: authClient,
  });
}

async function _writeGoogleSheet(
  googleSheetClient,
  sheetId,
  tabName,
  range,
  data
) {
  try {
    // Ensure all rows have exactly 9 columns
    const formattedData = data.map((row) => {
      while (row.length < 9) row.push(""); // Fill missing columns
      return row.slice(0, 9); // Trim excess columns
    });

    await googleSheetClient.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${tabName}!A1`, // Start from column A
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      resource: { values: formattedData },
    });

    console.log("✅ Google Sheet updated successfully!");
  } catch (error) {
    console.error("❌ Error updating Google Sheet:", error.message);
  }
}
