import fs from "fs";
import readline from "readline";

async function processHDFC(inputFile, outputFile) {
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

        // Detect transaction sections
        if (trimmedLine.includes("Domestic Transactions")) {
            currentSection = "Domestic";
            currentCurrency = "INR";
        } 
        else if (trimmedLine.includes("International Transactions")) {
            currentSection = "International";
        }
        // Detect cardholder name
        else if (/^,([^,]+),/.test(trimmedLine)) {
            const match = trimmedLine.match(/^,([^,]+),/);
            currentCardName = match[1].trim();
        }
        // Process transaction lines
        else if (/^\d{2}-\d{2}-\d{4}/.test(trimmedLine)) {
            const [date, description, amount] = trimmedLine.split(',').map(x => x.trim());
            
            // Amount processing
            const isCredit = amount.toLowerCase().endsWith('cr');
            const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
            const debit = !isCredit ? numericAmount : 0;
            const credit = isCredit ? numericAmount : 0;

            // Description and currency handling
            let processedDesc = description;
            let currency = currentCurrency;
            let location = 'unknown';

            if (currentSection === "International") {
                // Extract currency from description
                const descParts = description.split(/\s+/);
                currency = descParts.pop() || 'USD';
                processedDesc = descParts.join(' ');
                
                // Extract location from remaining description
                const locationParts = processedDesc.split(/\s+/);
                location = locationParts.pop()?.toLowerCase() || 'unknown';
                processedDesc = locationParts.join(' ');
            } else {
                // Extract location for domestic transactions
                const locationParts = description.split(/\s+/);
                location = locationParts.pop()?.toLowerCase() || 'unknown';
                processedDesc = locationParts.join(' ');
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

    // Generate CSV output
    const header = "Date,Transaction Description,Debit,Credit,Currency,CardName,Transaction,Location\n";
    const csvContent = results.map(row => 
        `${row.Date},${row["Transaction Description"]},${row.Debit},${row.Credit},${row.Currency},${row.CardName},${row.Transaction},${row.Location}`
    ).join("\n");

    fs.writeFileSync(outputFile, header + csvContent);
}

export default processHDFC;