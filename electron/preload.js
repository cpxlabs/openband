const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  showOpenDialog: (options) => ipcRenderer.invoke("show-open-dialog", options),
  showSaveDialog: (options) => ipcRenderer.invoke("show-save-dialog", options),
  readFile: (path) => ipcRenderer.invoke("read-file", path),
  writeFile: (path, data) => ipcRenderer.invoke("write-file", path, data),
  getDocumentsPath: () => ipcRenderer.invoke("get-documents-path"),
  getAppDataPath: () => ipcRenderer.invoke("get-app-data-path"),
  listProjects: () => ipcRenderer.invoke("list-projects"),
  saveProject: (id, data) => ipcRenderer.invoke("save-project", id, data),
  loadProject: (id) => ipcRenderer.invoke("load-project", id),
  deleteProject: (id) => ipcRenderer.invoke("delete-project", id),
  onMenuAction: (callback) => {
    const handler = (_event, action) => callback(action);
    ipcRenderer.on("menu-action", handler);
    return () => ipcRenderer.removeListener("menu-action", handler);
  },
  removeMenuActionListener: () => {
    ipcRenderer.removeAllListeners("menu-action");
  },
});
