import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { fileURLToPath } from 'url'
import { dirname } from 'path';
import os from "os";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import fs from "fs"
import sharp from "sharp"
import express from "express"
import bodyParser from 'body-parser';
import { getSettings, updateSettings } from "./functions/settings.js";
const desktopPath = os.homedir() + '/Documents/hotfolder/';

const publicDirectoryPath = path.join(__dirname, 'public');
let lastFileWritten = "Waiting for file to write"
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
    console.log(req.body)
    try{
        for(let f of req.body.files){
            if(f.type == "png" || f.type == "jpg"){
                const buffer = Buffer.from(f.buffer, "binary");
                let image = sharp(buffer)
                let trimmedBase64 = await image.png({ quality: 100 }).toBuffer();
                trimmedBase64 = trimmedBase64.toString("base64")
                fs.writeFile(`${desktopPath}/${req.body.sku}.${f.type}`, trimmedBase64, "base64", (err) => {
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
exp.post("/roq", (req, res)=>{
    let content = `${req.body.barcode};${req.body.barcode}-label.zpl;;;;;${req.body.quantity};;;${req.body.pause};${req.body.QuantityToStack};${req.body.Recipe};${req.body.sleeves};${req.body.body};${req.body.exit}`
    try{
        fs.writeFile(`${desktopPath}/${req.body.barcode}.csv`, content, (err)=>{
            if(err) console.log(err)
        })
        fs.writeFile(`${ desktopPath}/${req.body.barcode}-label.zpl`, req.body.label? req.body.label: "no label", (err)=>{
            if(err) console.log(err)
        })
        lastFileWritten = `${req.body.barcode}-label.zpl & ${req.body.barcode}.csv`
        //waiting.push({id:req.body.barcode, exit: req.body.exit})
        //if(!monitorRunning) monitor("dummy.csv", req.body.barcode)
        res.send({error: false, msg: "files written"})
    }catch(e){
        console.log(e)
        res.send({error: true, msg: e})
    }
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

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 450,
    height: 300,
    icon: path.join(__dirname, "/public/logo-dark-400-greenbg.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
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
  // // and load the index.html of the app.
  // mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.loadURL("http://localhost:3500")
  mainWindow.maximize();

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();
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
