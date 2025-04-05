import fs from "fs";
import readline from "readline";

// Helper function to extract location from a description.
// If the last word is all letters, it is assumed to be the location.
function extractLocation(desc) {
    const parts = desc.trim().split(/\s+/);
    if (parts.length > 1) {
        const potentialLocation = parts[parts.length - 1].toLowerCase();
        if (/^[a-z]+$/.test(potentialLocation)) {
            return {
                location: potentialLocation,
                description: parts.slice(0, parts.length - 1).join(' ')
            };
        }
    }
    return { location: 'unknown', description: desc };
}

async function processICICI(inputFile, outputFile) {
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
        } 
        else if (trimmedLine.includes("International Transaction")) {
            currentSection = "International";
        }
        // Cardholder detection
        else if (trimmedLine.startsWith(",,")) {
            const parts = trimmedLine.split(',').map(p => p.trim());
            if (parts[2] && !parts[2].includes("Transaction")) {
                currentCardName = parts[2];
            }
        }
        // Transaction processing
        else if (/^\d{2}-\d{2}-\d{4}/.test(trimmedLine)) {
            // Improved CSV parsing with proper comma separation
            const fields = trimmedLine.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
                            .map(f => f.trim().replace(/^"(.*)"$/, '$1'));

            const [date, description, debitStr, creditStr] = fields;
            const debit = parseFloat(debitStr) || 0;
            const credit = parseFloat(creditStr) || 0;

            let processedDesc = description;
            let currency = currentCurrency;
            let location = 'unknown';

            if (currentSection === "International") {
                // For international transactions, assume the last two words represent location and currency
                const parts = processedDesc.trim().split(/\s+/);
                if (parts.length >= 2) {
                    currency = parts.pop() || currentCurrency;
                    location = parts.pop()?.toLowerCase() || 'unknown';
                    processedDesc = parts.join(' ');
                }
            } else {
                // For domestic transactions, use the helper function to extract location
                const extraction = extractLocation(processedDesc);
                location = extraction.location;
                processedDesc = extraction.description;
            }

            results.push({
                Date: date,
                "Transaction Description": processedDesc,
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

export default processICICI;
