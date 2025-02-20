import { pdf } from "pdf-to-img";
import { promises as _fs } from "node:fs";

export async function processPdf(filePath) {
  console.log("📄 Converting PDF to images:", filePath);
  let imagePaths = [];

  try {
    const document = await pdf(filePath, { scale: 2 });

    let counter = 1;
    for await (const image of document) {
      const imagePath = `./${filePath + counter}.png`;
      await _fs.writeFile(imagePath, image);
      imagePaths.push(imagePath);
      counter++;
    }

    return imagePaths;
  } catch (error) {
    console.error("❌ Error processing PDF:", error);
    return [];
  }
}
