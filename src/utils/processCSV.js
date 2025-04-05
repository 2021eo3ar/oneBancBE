import fs from "fs";
import readline from "readline";
import moment from "moment";

// Bank-Specific Processors
const bankProcessors = {
  HDFC: {
    isBank: (line) =>
      line.includes("Domestic Transactions,") ||
      line.includes("International Transaction,"),
    processLine: (line, context) => {
      const columns = parseCSVLine(line);
      if (columns.length < 3 || !/^\d{2}-\d{2}-\d{4}/.test(columns[0]))
        return null;

      let [date, description, debit, credit] = columns;
      debit = debit || "";
      credit = credit || "";

      return { Date: date, Description: description, Debit: debit, Credit: credit };
    },
  },
  ICICI: {
    isBank: (line) =>
      line.includes("Transaction Description") &&
      line.includes("Debit,Credit") &&
      !line.includes("Debit,Credit,Transaction Details"),
    processLine: (line, context) => {
      const columns = parseCSVLine(line);
      if (columns.length < 4 || !/^\d{2}-\d{2}-\d{4}/.test(columns[0]))
        return null;

      let [date, description, debit, credit] = columns;
      return { Date: date, Description: description, Debit: debit, Credit: credit };
    },
  },
  Axis: {
    isBank: (line) => line.includes("Debit,Credit,Transaction Details"),
    processLine: (line, context) => {
      const columns = parseCSVLine(line);
      if (columns.length < 4 || !/^\d{2}-\d{2}-\d{4}/.test(columns[0]))
        return null;

      let [date, debit, credit, description] = columns;
      debit = debit || "";
      credit = credit || "";
      return { Date: date, Description: description, Debit: debit, Credit: credit };
    },
  },
};

// Main Processing Function
async function processCSV(inputFile, outputFile) {
  const results = [];
  let currentBank = null;
  let context = {
    section: "Domestic",
    cardName: "Unknown",
    currency: "INR",
    location: "unknown",
  };

  const rl = readline.createInterface({
    input: fs.createReadStream(inputFile),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Bank Detection (only once, at the header)
    if (!currentBank) {
      currentBank = Object.entries(bankProcessors).find(([_, processor]) =>
        processor.isBank(trimmedLine)
      )?.[0];
      continue;
    }

    // Section Detection
    if (trimmedLine.includes("Domestic Transactions")) {
      context.section = "Domestic";
      context.currency = "INR";
    } else if (
      trimmedLine.includes("International Transactions") ||
      trimmedLine.includes("International Transaction")
    ) {
      context.section = "International";
    }

    // Cardholder Detection
    if (/^,+[^,]+(,+)?$/.test(trimmedLine)) {
      const parts = trimmedLine.split(",").filter((p) => p.trim());
      if (parts.length === 1) context.cardName = parts[0].trim();
      continue;
    }

    // Data Processing
    if (isDataRow(trimmedLine, currentBank)) {
      const processor = bankProcessors[currentBank];
      const row = processor.processLine(trimmedLine, context);
      if (!row) continue;

      const processed = processCommon(row, context, currentBank);
      if (processed) results.push(processed);
    }
  }

  // Write Output
  const header =
    "Date,Transaction Description,Debit,Credit,Currency,CardName,Transaction,Location\n";
  const csvContent = results
    .map(
      (row) =>
        `${row.Date},${row["Transaction Description"]},${row.Debit},${row.Credit},${row.Currency},${row.CardName},${row.Transaction},${row.Location}`
    )
    .join("\n");

  fs.writeFileSync(outputFile, header + csvContent);
}

// Common Processing Function
function processCommon(row, context, bankType) {
  // Date Handling
  const dateFormats =
    bankType === "IDFC" ? ["MM-DD-YYYY"] : ["DD-MM-YYYY", "MM-DD-YYYY", "DD-MM-YY"];
  let parsedDate = null;
  for (const format of dateFormats) {
    parsedDate = moment(row.Date, format, true);
    if (parsedDate.isValid()) break;
  }
  const formattedDate = parsedDate?.isValid()
    ? parsedDate.format("DD-MM-YYYY")
    : row.Date;

  // Amount Handling
  let debit = parseFloat(row.Debit) || 0;
  let credit = parseFloat(row.Credit) || 0;

  // Description, Currency & Location
  let description = row.Description.trim();
  let currency = context.currency;
  let location = "unknown";

  // Extract currency and location for international transactions
  if (context.section === "International") {
    const currencyMatch = description.match(/(USD|EUR|GBP|POUND)\s*$/i);
    if (currencyMatch) {
      currency = currencyMatch[0].toUpperCase().replace("POUND", "GBP");
      description = description.replace(currencyMatch[0], "").trim();
    }
  }

  // Location Extraction
  const locationParts = description.split(/\s+/);
  if (locationParts.length > 1) {
    location = locationParts.pop().replace(/[^a-zA-Z]/g, "").toLowerCase();
    description = locationParts.join(" ");
  }

  return {
    Date: formattedDate,
    "Transaction Description": description,
    Debit: debit.toFixed(2),
    Credit: credit.toFixed(2),
    Currency: currency,
    CardName: context.cardName,
    Transaction: context.section,
    Location: location,
  };
}

// Helper Functions
function isDataRow(line, bankType) {
  const trimmed = line.trim();
  if (!trimmed) return false;

  switch (bankType) {
    case "IDFC":
      return /".+",\d{2}-\d{2}-\d{4},/.test(trimmed);
    case "HDFC":
    case "ICICI":
    case "Axis":
      return /^\d{2}-\d{2}-\d{4}/.test(trimmed);
    default:
      return false;
  }
}

function parseCSVLine(line) {
  return line
    .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
    .map((c) => c.trim().replace(/^"|"$/g, ""));
}

export default processCSV;