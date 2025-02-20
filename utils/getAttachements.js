import fs from "fs";
import path from "path";
import axios from "axios";
import { config } from "dotenv";
config();

// Function to download attachment
export async function getAttachments(emailId, accessToken) {
  try {
    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${process.env.SHARED_MAILBOX}/messages/${emailId}/attachments`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const attachments = response.data.value;
    let savedFiles = [];

    for (const attachment of attachments) {
      const dir = "attachments";
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);
      if (attachment["@odata.type"] === "#microsoft.graph.fileAttachment") {
        const filePath = path.join(dir, attachment.name);
        fs.writeFileSync(
          filePath,
          Buffer.from(attachment.contentBytes, "base64")
        );
        console.log(`📁 Saved attachment: ${attachment.name}`);
        savedFiles.push(filePath);
      }
    }

    return savedFiles;
  } catch (error) {
    console.error(
      `❌ Failed to get attachments for email ${emailId}:`,
      error.response?.data || error.message
    );
    return [];
  }
}
