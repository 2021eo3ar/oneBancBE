import fs from "fs";
import readline from "readline";
import moment from "moment";

// Helper functions
const extractLocation = (desc) => {
    const parts = desc.trim().split(/\s+/);
    if (parts.length > 0) {
        const potentialLocation = parts.pop().replace(/[^a-zA-Z]/g, "").toLowerCase();
        return {
            location: potentialLocation || "unknown",
            description: parts.join(" ")
        };
    }
    return { location: "unknown", description: desc };
};

const parseAmount = (amountStr) => {
    const isCredit = amountStr.toLowerCase().includes("cr");
    const numericValue = parseFloat(amountStr.replace(/[^0-9.-]/g, "")) || 0;
    return {
        debit: !isCredit ? numericValue : 0,
        credit: isCredit ? numericValue : 0
    };
};

async function processCSV(inputFile, outputFile) {
    const results = [];
    let currentSection = "Domestic";
    let currentCardName = "Unknown";
    let currentCurrency = "INR";

    const rl = readline.createInterface({
        input: fs.createReadStream(inputFile),
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Section detection
        if (trimmedLine.includes("Domestic Transactions")) {
            currentSection = "Domestic";
            currentCurrency = "INR";
        } else if (trimmedLine.includes("International Transactions")) {
            currentSection = "International";
        }

        // Cardholder name detection
        if (/^,+[^,]+(,+)?$/.test(trimmedLine)) { // IDFC pattern
            const parts = trimmedLine.split(",").filter(p => p.trim());
            if (parts.length === 1) currentCardName = parts[0];
        } else if (/^,([^,]+),/.test(trimmedLine)) { // HDFC pattern
            const match = trimmedLine.match(/^,([^,]+),/);
            currentCardName = match[1].trim();
        } else if (trimmedLine.startsWith(",,")) { // ICICI pattern
            const parts = trimmedLine.split(",").map(p => p.trim());
            if (parts[2]) currentCardName = parts[2];
        } else { // AXIS pattern
            const parts = trimmedLine.split(",").map(p => p.trim());
            if (parts.length >= 3 && parts[0] === "" && parts[1] === "" && parts[2]) {
                currentCardName = parts[2];
            }
        }

        // Transaction processing
        let transactionData = null;
        const fields = trimmedLine.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(f => f.trim().replace(/^"(.*)"$/, "$1"));
        
        // Try IDFC format
        if (/^"([^"]+)",(\d{2}-\d{2}-\d{4}),([\d\sCr]+)/.test(trimmedLine)) {
            const [_, desc, date, amt] = trimmedLine.match(/"([^"]+)",(\d{2}-\d{2}-\d{4}),([\d\sCr]+)/);
            const { debit, credit } = parseAmount(amt);
            const parsedDate = moment(date, "MM-DD-YYYY").format("DD-MM-YYYY");
            transactionData = { date: parsedDate, desc, debit, credit };
        }
        // Try HDFC/AXIS/ICICI format
        else if (fields.length >= 4 && /^\d{2}-\d{2}-\d{4}/.test(fields[0])) {
            const [date, desc, debitStr, creditStr] = fields;
            const debit = parseFloat(debitStr) || 0;
            const credit = parseFloat(creditStr) || 0;
            transactionData = { date, desc, debit, credit };
        }
        // Try AXIS debit/credit format
        else if (fields.length >= 4 && !isNaN(fields[1]) && !isNaN(fields[2])) {
            const [date, debit, credit, desc] = fields;
            transactionData = { date, desc, debit: parseFloat(debit), credit: parseFloat(credit) };
        }

        if (transactionData) {
            let { date, desc, debit, credit } = transactionData;
            let currency = currentCurrency;
            let location = "unknown";

            // International transaction handling
            if (currentSection === "International") {
                const descParts = desc.split(/\s+/);
                if (descParts.length > 1) {
                    currency = descParts.pop() || "USD";
                    const locPart = descParts.pop() || "unknown";
                    location = locPart.replace(/[^a-zA-Z]/g, "").toLowerCase();
                    desc = descParts.join(" ");
                }
            } else {
                const extraction = extractLocation(desc);
                location = extraction.location;
                desc = extraction.description;
            }

            results.push({
                Date: date,
                "Transaction Description": desc,
                Debit: debit.toFixed(2),
                Credit: credit.toFixed(2),
                Currency: currency,
                CardName: currentCardName,
                Transaction: currentSection,
                Location: location
            });
        }
    }

    // Generate CSV
    const header = "Date,Transaction Description,Debit,Credit,Currency,CardName,Transaction,Location\n";
    const csvContent = results.map(row =>
        `"${row.Date}","${row["Transaction Description"]}",${row.Debit},${row.Credit},${row.Currency},${row.CardName},${row.Transaction},${row.Location}`
    ).join("\n");
    
    fs.writeFileSync(outputFile, header + csvContent);
}

export default processCSV;