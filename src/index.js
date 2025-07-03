import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { fileURLToPath } from 'url'
import { dirname } from 'path';
import os from "os";
import atob from  "atob";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import fs from "fs"
import express from "express"
import bodyParser from 'body-parser';
import { getSettings, updateSettings } from "./functions/settings.js";
import update from "./functions/update.cjs"
update();
const desktopPath = os.homedir() + '/Documents/pythias/';

const publicDirectoryPath = path.join(__dirname, 'public');
let lastFileWritten = "Waiting for file to write"
import {spawn} from "child_process";
import ptp from "pdf-to-printer2";
const exp = express();
exp.set('view engine', 'ejs');
exp.set('views', __dirname + '/views/');
exp.use(express.static(process.cwd() + '/views'));
exp.use(express.static(publicDirectoryPath));
exp.use(
    bodyParser.urlencoded({
        limit: "1000000gb",
        parameterLimit: 1000000000000,
        extended: true,
    })
)
exp.use(bodyParser.json({ limit: "1000000gb" }));
exp.get('/', function(req, res) {
    res.render('index', {lastFileWritten});
});
exp.get("/settings", async (req,res)=>{
  let settings = await getSettings()
  console.log(settings)
  res.render("settings", {settings})
})
exp.post("/settings", async (req,res)=>{
  console.log(req.body)
  let settings = await getSettings()
  settings[req.body.name] = req.body.path
  await updateSettings(settings);
  res.send({error: false})
})
exp.get('/update', function(req, res) {
  res.send({lastFileWritten});
});
exp.post("/", async (req,res)=>{
  let settings = await getSettings();
    console.log(req.body)
    try{
        for(let f of req.body.files){
            if(f.type == "png" || f.type == "jpg"){
                const buffer = Buffer.from(f.buffer, "binary");
                let trimmedBase64 = buffer.toString("base64");
                console.log(trimmedBase64)
                fs.writeFile(`${settings["dtf"]}/${req.body.sku}.${f.type}`, trimmedBase64, "base64", (err) => {
                    if (err) console.log(err);
                  });
                lastFileWritten = `${req.body.sku}.${f.type}`
            }
        }
        res.send({error: false, msg: "file written"})
    }catch(e){
        console.log(e)
        res.send({error: true, msg: e})
    }
})
exp.post("/embroidery", async (req,res)=>{
  let settings = await getSettings();
    console.log(req.body)
    try{
        for(let f of req.body.files){
          console.log(f.buffer)
          fs.writeFile(`${settings["embroidery"]}/${req.body.sku}.${f.type}`, Buffer.from(f.buffer), "base64", (err) => {
              if (err) console.log(err);
            });
          lastFileWritten = `${req.body.sku}.${f.type}`
        }
        res.send({error: false, msg: "file written"})
    }catch(e){
        console.log(e)
        res.send({error: true, msg: e})
    }
})
exp.post("/roq", async (req, res)=>{
  let settings = await getSettings()
  console.log(req.body, !req.body.roqNew)
    let content
    if(req.body.labelType != "pdf"){
      if(!req.body.roqNew){
        content = `${req.body.barcode};${req.body.barcode}-label.zpl;;;;;${req.body.quantity};;;${req.body.pause};${req.body.QuantityToStack};${req.body.Recipe};${req.body.sleeves};${req.body.body};${req.body.exit}`
      }else{
        content = `${req.body.barcode};;;;;;${req.body.QuantityToStack};${req.body.barcode}-label.zpl;${req.body.Recipe}.xml;${req.body.exit};${req.body.quantity}`
      }
      console.log(content, "content", !req.body.roqNew )
    }else{
      if(!req.body.roqNew){
        content = `${req.body.barcode};${req.body.label? `${req.body.barcode}-label.pdf`: `${req.body.barcode}-label.zpl`};;;;;${req.body.quantity};;;${req.body.pause};${req.body.QuantityToStack};${req.body.Recipe};${req.body.sleeves};${req.body.body};${req.body.exit}`
      }else{
       content =  `${req.body.barcode};;;;;;${req.body.QuantityToStack};${req.body.barcode}-label.pdf;${req.body.Recipe}.xml;${req.body.exit};${req.body.quantity}`
      }
     console.log(content, "content", !req.body.roqNew )
    }
    console.log(content, "content", !req.body.roqNew )
    try{
        if(req.body.labelType != "pdf"){
          let buffer
          if(req.body.label) buffer = Buffer.from(req.body.label, "base64");
          fs.writeFile(`${settings["roq"]}/${req.body.barcode}-label.zpl`, req.body.label? buffer: "no label", async (err)=>{
            if(err) console.log(err)
            else {
              await new Promise((resolve)=>{
                setTimeout(()=>{
                  resolve()
                }, 1000)
              })
              fs.writeFile(`${settings["roq"]}/${req.body.barcode}-!pdf-labelType.csv`, content, (err)=>{
              if(err) console.log(err)
                lastFileWritten = `${req.body.barcode}-label.zpl & ${req.body.barcode}.csv`
              })
            }
          })
        }else{
          let buffer
          if(req.body.label) {
            buffer = Buffer.from(req.body.label, "base64");
            fs.writeFile(`${settings["roq"]}/${req.body.barcode}-label.pdf`, req.body.label? buffer: "no label", async (err)=>{
                if(err) console.log(err)
                else {
                  await new Promise((resolve)=>{
                    setTimeout(()=>{
                      resolve()
                    }, 10)
                  })
                  fs.writeFile(`${settings["roq"]}/${req.body.barcode}-pdf-labelType.csv`, content, (err)=>{
                  if(err) console.log(err)
                    lastFileWritten = `${req.body.barcode}-label.pdf & ${req.body.barcode}.csv`
                  })
                }
            })
          }else{
            fs.writeFile(`${settings["roq"]}/${req.body.barcode}-label.zpl`, "no label", async (err)=>{
              if(err) console.log(err)
              else {
                await new Promise((resolve)=>{
                  setTimeout(()=>{
                    resolve()
                  }, 10)
                })
                fs.writeFile(`${settings["roq"]}/${req.body.barcode}-pdfLabelType-no-label.csv`, content, (err)=>{
                  if(err) console.log(err)
                  lastFileWritten = `${req.body.barcode}-label.zpl & ${req.body.barcode}.csv`
                })
              }
            })
          }
        }
        //waiting.push({id:req.body.barcode, exit: req.body.exit})
        //if(!monitorRunning) monitor("dummy.csv", req.body.barcode)
        res.send({error: false, msg: "files written"})
    }catch(e){
        console.log(e)
        res.send({error: true, msg: e})
    }
})
exp.post("/print-shipping", async (req, res)=>{
  let settings = await getSettings()
  let printerName = settings["shippingLabelPrinter"]
  const buffer = Buffer.from(req.body.label, "base64");
  fs.writeFile(`${desktopPath}/${req.body.barcode}-label.pdf`, buffer, (err)=>{
    if(err) console.log(err)
    else {
      ptp
      .print(`${desktopPath}/${req.body.barcode}-label.pdf`, {printer: printerName,  unix: ["-o fit-to-page"],
        win32: ['-print-settings "fit"']})
      .then(()=>{
        lastFileWritten = `${req.body.barcode}-label.zpl`
        res.send({error: false})
      })
      .catch((e)=>{
        res.send({error: true, msg: e, printer: printerName})
      });
    }
  })
})
exp.post("/print-labels", async (req, res)=>{
  let settings = await getSettings()
  let printerName = settings["shippingLabelPrinter"]
  const buffer = Buffer.from(req.body.label, "base64");
  fs.writeFile(`${desktopPath}/${req.body.barcode}-label.pdf`, buffer, (err)=>{
    if(err) console.log(err)
    else {
      ptp
      .print(`${desktopPath}/${req.body.barcode}-label.pdf`, {printer: printerName,  unix: ["-o fit-to-page"],
        win32: ['-print-settings "paper=My Custom Paper-100*120"'], paperSize: "My Custom Paper-57 x 51", scale: "fit"})
      .then(()=>{
        lastFileWritten = `label.pdf`
        res.send({error: false})
      })
      .catch((e)=>{
        res.send({error: true, msg: e, printer: printerName})
      });
    }
  })
})
exp.post("/sublimation", async (req, res) => {
  let settings = await getSettings()
  let data = req.body
  console.log(data)
    if(data.folder == "11 oz"){
      const buffer = Buffer.from(data.base64, "base64");
      fs.writeFile(
        `${settings[data.folder]}/${data.pieceId}.pdf`,
        buffer,
        (err) => {
          if (err) console.log(err);
        }
      );
    }else if (data.folder == "15 oz") {
       const buffer = Buffer.from(data.base64, "base64");
       fs.writeFile(
         `${settings[data.folder]}/${data.pieceId}.pdf`,
         buffer,
         (err) => {
           if (err) console.log(err);
         }
       );
    } else if (data.folder == "poster") {
    } else if (data.folder == "premium") {
    } else if (data.folder == "epson") {
      const buffer = Buffer.from(data.base64, "base64");
      fs.writeFile(
        `${settings[data.folder]}/${data.pieceId}.pdf`,
        buffer,
        (err) => {
          if (err) console.log(err);
        }
      );
    } else if (data.folder == "stickers") {
      const buffer = Buffer.from(data.base64, "base64");
      fs.writeFile(
        `${settings[data.folder]}/${data.pieceId}.pdf`,
        buffer,
        (err) => {
          if (err) console.log(err);
        }
      );
    } else if (data.folder == "buttons") {
    }
    return {error:false, msg: 'something'}
});
exp.listen(3500, async function () {
    console.log("writer listening on port 3500");
});


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = async () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 450,
    height: 300,
    icon: path.join(__dirname, "/public/logoPythias-400.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
    },
  });
  ipcMain.handle("dialog:openDirectory", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
    });
    if (canceled) {
      return;
    } else {
      return filePaths[0];
    }
  });

  ipcMain.on("print-document", (event, options) => {
    // Use a printing library (like `pdf-to-printer`) to print the received HTML
    // ... handle printing logic here
    print(path.join(__dirname, `/assets/${options.file}`), {
      printer: options.printer,
    });
  })
  ipcMain.handle("printers", async (event) => {
    // Use a printing library (like `pdf-to-printer`) to print the received HTML
    // ... handle printing logic here
    console.log("here")
    const printers = await mainWindow.webContents.getPrintersAsync();
    let printerNames= printers.map(p=>{
      return p.name
    })
    console.log(printerNames)
    return printerNames
  })
  // // and load the index.html of the app.
  // mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.loadURL("http://localhost:3500")
  mainWindow.maximize();

  // Open the DevTools.
 mainWindow.webContents.openDevTools();
  // const printers = await mainWindow.webContents.getPrintersAsync();
  // let printerNames= printers.map(p=>{
  //   return p.name
  // })
  // console.log(printerNames)
  // print(path.join(__dirname, "/assets/DecisionLetter20250129082714.pdf"), {printer:"HP OfficeJet Pro 8020 series [63D443]"});
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
