import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import processCSV from "../utils/processCSV.js";
import processIDFC from "../utils/processIDFC.js";
import processAXIS from "../utils/processAXIS.js";
import processHDFC from "../utils/processHDFC.js";
import processICICI from "../utils/processICICI.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const processFile = async (req, res) => {
  try {
    const inputFilePath = req.file.path;
    const originalFileName = req.file.originalname;
    const outputFileName = originalFileName.replace("Input", "Output");
    const outputFilePath = path.join(__dirname, "../outputs", outputFileName);

    const isIDFC = originalFileName.toLowerCase().includes("idfc");
    const isAxis = originalFileName.toLowerCase().includes("axis");
    const isHDFC = originalFileName.toLowerCase().includes("hdfc");
    const isICICI = originalFileName.toLowerCase().includes("icici");

    if (isIDFC) {
      await processIDFC(inputFilePath, outputFilePath);
    } else if (isAxis) {
      await processAXIS(inputFilePath, outputFilePath);
    } else if (isHDFC) {
      await processHDFC(inputFilePath, outputFilePath);
    } else if (isICICI) {
      await processICICI(inputFilePath, outputFilePath);
    } else {
      await processCSV(inputFilePath, outputFilePath);
    }

    // Send the file as a downloadable response
    res.download(outputFilePath, outputFileName, (err) => {
      if (err) {
        res.status(500).json({ error: "Error sending file" });
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Error processing file" });
  }
};
