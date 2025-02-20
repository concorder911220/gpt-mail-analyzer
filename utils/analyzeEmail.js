import { OpenAI } from "openai";
import { config } from "dotenv";
import { cleanHtml } from "./cleanHtml.js";
import fs from "fs";
config();

const openAi = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeEmail(email, imagePaths) {
  const emailInfo = cleanHtml(email);
  let messages = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Extract vendor offer details from this document and email text. email text is: ${emailInfo}. If the document or email text is NOT a vendor offer, respond with {"is_offer": false}. Otherwise, return data in this JSON format:
  
            {
              "is_offer": true,
              "vendor_name": "Name of the vendor",
              "product_details": [
                {
                  "product_name": "Name of the product",
                  "product_price": "Price of the product",
                  "offer_terms": "Offer terms and conditions"
                }
              ]
            }
  
            If multiple products are listed, return them in 'product_details'. If some details are missing, leave them empty but keep the JSON structure.
            Just need JSON formatted data as string and there can be multiple products.
            `,
        },
      ],
    },
  ];

  for (const imagePath of imagePaths) {
    const imageBase64 = fs.readFileSync(imagePath, { encoding: "base64" });
    messages[0].content.push({
      type: "image_url",
      image_url: { url: `data:image/png;base64,${imageBase64}` },
    });
  }

  try {
    const completion = await openAi.chat.completions.create({
      model: "gpt-4o",
      messages,
    });

    const responseText = completion.choices[0].message.content; // Example response
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);

    if (jsonMatch) {
      const jsonString = jsonMatch[1]; // Extract only the JSON part
      const jsonData = JSON.parse(jsonString);
      if (!jsonData.is_offer) {
        console.log("⚠️ No vendor offer found. Skipping email.");
        return null;
      }
      return jsonData;
    } else {
      console.error("❌ No valid JSON found in response!");
    }
  } catch (error) {
    console.error("❌ Error analyzing images:", error);
    return null;
  }
}
