const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  printDocument:   (options)  => ipcRenderer.send("print-document", options),
  selectFolder:    ()         => ipcRenderer.invoke("dialog:openDirectory"),
  printers:        ()         => ipcRenderer.invoke("printers"),
  minimizeToTray:  ()         => ipcRenderer.send("minimize-to-tray"),
  installUpdate:   ()         => ipcRenderer.send("install-update"),
  onUpdateStatus:  (callback) => ipcRenderer.on("update-status", (_e, data) => callback(data)),
});
