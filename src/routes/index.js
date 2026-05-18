import express from "express";
import fs from "fs/promises";
import os from "os";
import ptp from "pdf-to-printer2";
import { getSettings, updateSettings } from "../functions/settings.js";

const router = express.Router();
const desktopPath = os.homedir() + "/Documents/pythias/";

let lastFileWritten = "Waiting for file to write";

export const getLastFileWritten = () => lastFileWritten;

router.get("/", (req, res) => {
  res.render("index", { lastFileWritten });
});

router.get("/settings", async (req, res) => {
  const settings = await getSettings();
  res.render("settings", { settings });
});

router.post("/settings", async (req, res) => {
  const settings = await getSettings();
  settings[req.body.name] = req.body.path;
  await updateSettings(settings);
  res.send({ error: false });
});

router.get("/update", (req, res) => {
  res.send({ lastFileWritten });
});

router.post("/", async (req, res) => {
  const settings = await getSettings();
  try {
    for (const f of req.body.files) {
      if (f.type === "png" || f.type === "jpg") {
        const buffer = Buffer.from(f.buffer, "binary");
        const trimmedBase64 = buffer.toString("base64");
        await fs.writeFile(`${settings["dtf"]}/${req.body.sku}.${f.type}`, trimmedBase64, "base64");
        lastFileWritten = `${req.body.sku}.${f.type}`;
      }
    }
    res.send({ error: false, msg: "file written" });
  } catch (e) {
    console.error(e);
    res.send({ error: true, msg: String(e) });
  }
});

router.post("/embroidery", async (req, res) => {
  const settings = await getSettings();
  try {
    for (const f of req.body.files) {
      await fs.writeFile(`${settings["embroidery"]}/${req.body.sku}.${f.type}`, Buffer.from(f.buffer), "base64");
      lastFileWritten = `${req.body.sku}.${f.type}`;
    }
    res.send({ error: false, msg: "file written" });
  } catch (e) {
    console.error(e);
    res.send({ error: true, msg: String(e) });
  }
});

router.post("/roq", async (req, res) => {
  const settings = await getSettings();
  const { barcode, labelType, roqNew, label, quantity, pause, QuantityToStack, Recipe, sleeves, body, exit: exitVal } = req.body;

  let content;
  if (labelType !== "pdf") {
    content = roqNew
      ? `${barcode};;;;;;${QuantityToStack};${barcode}-label.zpl;${Recipe}.xml;${exitVal};${quantity}`
      : `${barcode};${barcode}-label.zpl;;;;;${quantity};;;${pause};${QuantityToStack};${Recipe};${sleeves};${body};${exitVal}`;
  } else {
    const labelFile = label ? `${barcode}-label.pdf` : `${barcode}-label.zpl`;
    content = roqNew
      ? `${barcode};;;;;;${QuantityToStack};${barcode}-label.pdf;${Recipe}.xml;${exitVal};${quantity}`
      : `${barcode};${labelFile};;;;;${quantity};;;${pause};${QuantityToStack};${Recipe};${sleeves};${body};${exitVal}`;
  }

  try {
    if (labelType !== "pdf") {
      const buffer = label ? Buffer.from(label, "base64") : null;
      await fs.writeFile(`${settings["roq"]}/${barcode}-label.zpl`, buffer ?? "no label");
      await fs.writeFile(`${settings["roq"]}/${barcode}-!pdf-labelType.csv`, content);
      lastFileWritten = `${barcode}-label.zpl & ${barcode}.csv`;
    } else if (label) {
      const buffer = Buffer.from(label, "base64");
      await fs.writeFile(`${settings["roq"]}/${barcode}-label.pdf`, buffer);
      await fs.writeFile(`${settings["roq"]}/${barcode}-pdf-labelType.csv`, content);
      lastFileWritten = `${barcode}-label.pdf & ${barcode}.csv`;
    } else {
      await fs.writeFile(`${settings["roq"]}/${barcode}-label.zpl`, "no label");
      await fs.writeFile(`${settings["roq"]}/${barcode}-pdfLabelType-no-label.csv`, content);
      lastFileWritten = `${barcode}-label.zpl & ${barcode}.csv`;
    }
    res.send({ error: false, msg: "files written" });
  } catch (e) {
    console.error(e);
    res.send({ error: true, msg: String(e) });
  }
});

router.post("/print-shipping", async (req, res) => {
  const settings = await getSettings();
  const printerName = settings["shippingLabelPrinter"];
  const buffer = Buffer.from(req.body.label, "base64");
  const filePath = `${desktopPath}/${req.body.barcode}-label.pdf`;
  try {
    await fs.writeFile(filePath, buffer);
    await ptp.print(filePath, {
      printer: printerName,
      unix: ["-o fit-to-page"],
      win32: ['-print-settings "fit"'],
    });
    lastFileWritten = `${req.body.barcode}-label.pdf`;
    res.send({ error: false });
  } catch (e) {
    console.error(e);
    res.send({ error: true, msg: String(e), printer: printerName });
  }
});

router.post("/print-labels", async (req, res) => {
  const settings = await getSettings();
  const printerName = settings["shippingLabelPrinter"];
  const buffer = Buffer.from(req.body.label, "base64");
  const filePath = `${desktopPath}/${req.body.barcode}-label.pdf`;
  try {
    await fs.writeFile(filePath, buffer);
    await ptp.print(filePath, {
      printer: printerName,
      unix: ["-o fit-to-page"],
      win32: ['-print-settings "paper=My Custom Paper-100*120"'],
      paperSize: "My Custom Paper-57 x 51",
      scale: "fit",
    });
    lastFileWritten = "label.pdf";
    res.send({ error: false });
  } catch (e) {
    console.error(e);
    res.send({ error: true, msg: String(e), printer: printerName });
  }
});

router.post("/sublimation", async (req, res) => {
  const settings = await getSettings();
  const { folder, base64, pieceId } = req.body;
  const writableFolders = ["11 oz", "15 oz", "epson", "stickers"];
  try {
    if (writableFolders.includes(folder)) {
      const buffer = Buffer.from(base64, "base64");
      await fs.writeFile(`${settings[folder]}/${pieceId}.pdf`, buffer);
    }
    res.send({ error: false, msg: "file written" });
  } catch (e) {
    console.error(e);
    res.send({ error: true, msg: String(e) });
  }
});

export default router;
