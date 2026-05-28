import "dotenv/config";
import express from "express";
import cors from"cors";
import helmet from "helmet";
import {nasabahRoutes} from './modules/nasabah/nasabah.route'
import {tabunganRoutes} from './modules/tabungan/tabungan.route'
import {authRoutes} from './modules/auth/auth.route'
import {laporanRoutes} from './modules/laporan/laporan.route'

const app = express(); 
const port = process.env.PORT || 3000;

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get("/health", (req,res) => {
  res.json({
    status : "ok",
    service : "tabungan-haji-api",
    timestamp : new Date().toISOString(),
  });
});


app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/nasabah", nasabahRoutes);
app.use("/api/v1/tabungan-haji", tabunganRoutes);
app.use("/api/v1/laporan", laporanRoutes);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});