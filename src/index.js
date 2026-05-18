import { app, BrowserWindow, dialog, ipcMain, autoUpdater, Tray, Menu } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import express from "express";
import bodyParser from 'body-parser';
import routes from "./routes/index.js";
import setupUpdates from "./functions/update.cjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const publicDirectoryPath = path.join(__dirname, 'public');
const exp = express();
exp.set('view engine', 'ejs');
exp.set('views', __dirname + '/views/');
exp.use(express.static(process.cwd() + '/views'));
exp.use(express.static(publicDirectoryPath));
exp.use(bodyParser.urlencoded({ limit: "1000000gb", parameterLimit: 1000000000000, extended: true }));
exp.use(bodyParser.json({ limit: "1000000gb" }));
exp.use("/", routes);
exp.listen(3500, () => console.log("writer listening on port 3500"));

if (started) app.quit();

let mainWindow = null;
let tray = null;

const showWindow = () => {
  mainWindow.show();
  mainWindow.maximize();
  mainWindow.focus();
};

const createTray = () => {
  tray = new Tray(path.join(__dirname, '/public/pythias-logo-new-gold-black-bg.ico'));
  tray.setToolTip('Pythias File Writer');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open', click: showWindow },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); } },
  ]));
  tray.on('click', showWindow);
};

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 300,
    show: false,
    icon: path.join(__dirname, "/public/logoPythias-400.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  ipcMain.handle("dialog:openDirectory", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
    });
    return canceled ? undefined : filePaths[0];
  });

  ipcMain.on("print-document", (event, options) => {
    print(path.join(__dirname, `/assets/${options.file}`), { printer: options.printer });
  });

  ipcMain.handle("printers", async () => {
    const printers = await mainWindow.webContents.getPrintersAsync();
    return printers.map(p => p.name);
  });

  ipcMain.on("minimize-to-tray", () => mainWindow.hide());
  ipcMain.on("install-update", () => autoUpdater.quitAndInstall());

  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.loadURL("http://localhost:3500");
};

app.whenReady().then(() => {
  app.setLoginItemSettings({ openAtLogin: true, name: 'Pythias File Writer' });
  createWindow();
  createTray();
  setupUpdates(mainWindow);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => { app.isQuiting = true; });
