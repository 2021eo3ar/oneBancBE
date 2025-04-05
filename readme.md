# Bank Statement Processor Backend

This repository contains the backend implementation for the Bank Statement Processor application. It provides APIs to process bank statement files from various banks and returns the processed data.

## Project Structure

```
backend/
 ├ 📂.git/
 ├ 📂node_modules/
 ├ 📂src/
 ┃ ├ 📂controllers/
 ┃ ┃ └ 📜fileController.js
 ┃ ├ 📂routes/
 ┃ ┃ └ 📜fileRoutes.js
 ┃ ├ 📂utils/
 ┃ ┃ ├ 📜processAXIS.js
 ┃ ┃ ├ 📜processCSV.js
 ┃ ┃ ├ 📜processHDFC.js
 ┃ ┃ ├ 📜processICICI.js
 ┃ ┃ └ 📜processIDFC.js
 ┃ ├ 📂outputs/
 ┃ ┃ ├ 📜HDFC-Output-Case1.csv
 ┃ ┃ └ 📜ICICI-Output-Case2.csv
 ┃ └ 📜server.js
 ├ 📂uploads/
 ┃ ├ 📜70bb2bc0df986e347fd91a1e0899d333
 ┃ └ 📜b87f197196a6f808faa90471db5a5cac
 ├ 📜environment
 ├ 📜gitenignore
 ├ 📜package-lock.json
 └ 📜package.json
```

### Folders and Files

- **.git/**: Git metadata for version control.
- **node_modules/**: Installed npm packages.
- **src/**: Main source folder.
  - **controllers/**: Contains logic for processing uploaded files.
  - **routes/**: Defines backend API endpoints.
  - **utils/**: Statement processors for each bank.
  - **outputs/**: Stores processed CSV outputs.
  - **server.js**: Main server file.
- **uploads/**: Temporarily stores uploaded input files.
- **.env**: Environment variables (e.g., PORT).
- **.gitignore**: Specifies files to ignore in Git.
- **package.json**: Project dependencies and metadata.
- **package-lock.json**: Locked dependency versions.

## Setup Instructions

### Prerequisites
- Node.js and npm installed

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/bank-statement-processor-backend.git
   ```

2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Create a `.env` file in the root and set:
   ```bash
   PORT=5000
   ```

4. Start the server:
   ```bash
   npm start
   ```

## API Endpoint

### `POST /api/files/upload`
Uploads a bank statement file and returns the processed file for download.

- **Request**: `multipart/form-data` with `file` field
- **Response**: Processed file as blob for download

## Live Link

You can access the live backend deployment here:
[Live Backend URL](https://onebancbe.onrender.com)

## License
MIT License

