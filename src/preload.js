// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  printDocument: (options) => {
    // Send the HTML content to the main process via IPC

    ipcRenderer.send("print-document", options);
  },
  selectFolder: () => ipcRenderer.invoke("dialog:openDirectory"),
});