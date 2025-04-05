import fs from "fs";
import readline from "readline";
import moment from "moment";

async function processIDFC(inputFile, outputFile) {
    const results = [];
    let currentSection = "Domestic";
    let currentCardName = "Unknown";
    let currentCurrency = "INR";
    let columnsMap = {};
    let isHeaderProcessed = false;

    const rl = readline.createInterface({
        input: fs.createReadStream(inputFile),
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Section Detection
        if (trimmedLine.includes("Domestic Transactions")) {
            currentSection = "Domestic";
            currentCurrency = "INR";
        } else if (trimmedLine.includes("International Transactions")) {
            currentSection = "International";
        }

        // Cardholder Detection
        else if (/^,+[^,]+(,+)?$/.test(trimmedLine)) {
            const parts = trimmedLine.split(",").filter(p => p.trim() !== "");
            if (parts.length === 1) currentCardName = parts[0].trim();
        }

        // Detect IDFC Header
        else if (trimmedLine.includes("Transaction Details") && trimmedLine.includes("Date")) {
            columnsMap = { Date: 1, Description: 0, Amount: 2 };
            isHeaderProcessed = true;
        }

        // Data Row Processing (IDFC-specific)
        else if (isHeaderProcessed && /"([^"]+)",(\d{2}-\d{2}-\d{4}),([\d\sCr]+)/.test(trimmedLine)) {
            const matches = trimmedLine.match(/"([^"]+)",(\d{2}-\d{2}-\d{4}),([\d\sCr]+)/);
            const [_, description, dateStr, amountStr] = matches;

            // Date Parsing
            const parsedDate = moment(dateStr, "MM-DD-YYYY", true); // IDFC dates are MM-DD-YYYY
            const formattedDate = parsedDate.isValid() ? parsedDate.format("DD-MM-YYYY") : dateStr;

            // Amount Handling
            let debit = 0, credit = 0;
            const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, "")) || 0;
            if (amountStr.toLowerCase().includes("cr")) {
                credit = amount;
            } else {
                debit = amount;
            }

            // Location Extraction (last word)
            const locationParts = description.trim().split(/\s+/);
            const location = locationParts.pop()?.replace(/[^a-zA-Z]/g, "").toLowerCase() || "unknown";

            results.push({
                Date: formattedDate,
                "Transaction Description": description.trim(),
                Debit: debit.toFixed(2),
                Credit: credit.toFixed(2),
                Currency: currentCurrency,
                CardName: currentCardName,
                Transaction: currentSection,
                Location: location
            });
        }
    }

    // Write Output CSV
    const header = "Date,Transaction Description,Debit,Credit,Currency,CardName,Transaction,Location\n";
    const csvContent = results.map(row => 
        `${row.Date},${row["Transaction Description"]},${row.Debit},${row.Credit},${row.Currency},${row.CardName},${row.Transaction},${row.Location}`
    ).join("\n");

    fs.writeFileSync(outputFile, header + csvContent);
}

export default processIDFC;