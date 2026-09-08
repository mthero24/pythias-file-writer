import express from "express";
import fs from "fs/promises";
import os from "os";
import ptp from "pdf-to-printer2";
import sharp from "sharp";
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
  const { folder, base64, pieceId, print: autoPrint } = req.body;
  const folderConfig = {
    "11 oz":           { ext: "pdf" },
    "15 oz":           { ext: "pdf" },
    "epson":           { ext: "pdf" },
    "stickers":        { ext: "pdf" },
    "poster-pagewide": { ext: "jpg", canPrint: true, printerKey: "posterPagewidePrinter" },
    "poster-epsonhot": { ext: "jpg", canPrint: true, printerKey: "posterEpsonPrinter" },
    "buttons":         { ext: "pdf", canPrint: true, printerKey: "buttonsPrinter" },
    "gift-messages":   { ext: "png", canPrint: true, printerKey: "giftMessagesPrinter" },
    "sawgrass":        { ext: "pdf" },
    "canvas":          { ext: req.body.ext || "tiff" },
    "pagewide":        { ext: "pdf" },
    "socks":           { ext: "png" },
  };
  try {
    const cfg = folderConfig[folder];
    if (cfg && settings[folder]) {
      const filePath = `${settings[folder]}/${pieceId}.${cfg.ext}`;
      const inputBuffer = Buffer.from(base64, "base64");
      const fileBuffer = folder === "gift-messages"
        ? await sharp(inputBuffer).png().toBuffer()
        : inputBuffer;
      await fs.writeFile(filePath, fileBuffer);
      lastFileWritten = `${pieceId}.${cfg.ext}`;
      const printerKey = cfg.printerKey;
      if (cfg.canPrint && autoPrint && printerKey && settings[printerKey]) {
        ptp.print(filePath, { printer: settings[printerKey] })
          .catch(e => console.error(`${folder} auto-print error:`, e));
      }
    }
    res.send({ error: false, msg: "file written" });
  } catch (e) {
    console.error(e);
    res.send({ error: true, msg: String(e) });
  }
});

export default router;
