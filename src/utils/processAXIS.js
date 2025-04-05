import fs from "fs";
import readline from "readline";

async function processAxis(inputFile, outputFile) {
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

        // Detect section headers
        if (trimmedLine.includes("Domestic Transactions")) {
            currentSection = "Domestic";
            currentCurrency = "INR";
        } else if (trimmedLine.includes("International Transactions")) {
            currentSection = "International";
        }

        // Detect cardholder name
        const parts = trimmedLine.split(',').map(p => p.trim());
        if (parts.length >= 3 && parts[0] === '' && parts[1] === '' && parts[2] !== '') {
            currentCardName = parts[2];
            continue;
        }

        // Process transaction lines
        if (/^\d{2}-\d{2}-\d{4}/.test(trimmedLine)) {
            const data = trimmedLine.split(',').map(d => d.trim());
            const date = data[0];
            const debit = parseFloat(data[1]) || 0;
            const credit = parseFloat(data[2]) || 0;
            let transactionDetails = data[3];

            let description, location, currency;

            if (currentSection === "Domestic") {
                currency = "INR";
                description = transactionDetails;
                const locationParts = description.split(/\s+/);
                location = locationParts.pop()?.toLowerCase() || 'unknown';
            } else {
                const detailsParts = transactionDetails.split(/\s+/);
                currency = detailsParts.pop() || 'USD';
                description = detailsParts.join(' ');
                location = detailsParts.length > 0 
                    ? detailsParts.pop()?.toLowerCase() 
                    : 'unknown';
            }

            results.push({
                Date: date,
                "Transaction Description": description,
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

export default processAxis;