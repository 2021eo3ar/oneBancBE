import express from "express";
import cors from "cors";
import fileRoutes from "./routes/fileRoutes.js";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/files", fileRoutes);

app.get("/", (req, res) => {
  res.send("The server is running fine");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
