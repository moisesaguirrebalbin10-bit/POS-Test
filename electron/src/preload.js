const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('posChifa', {
  printCurrentWindow: () => ipcRenderer.invoke('print-current-window'),
  listPrinters: () => ipcRenderer.invoke('list-printers'),
  getPrinterConfig: () => ipcRenderer.invoke('get-printer-config'),
  savePrinterConfig: config => ipcRenderer.invoke('save-printer-config', config)
});
