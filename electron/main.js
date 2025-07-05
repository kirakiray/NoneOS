import { app, BrowserWindow } from "electron";
import "./script/static.js";

const createWindow = (url) => {
  const win = new BrowserWindow({
    width: 800,
    height: 800,
  });

  //   win.loadFile("index.html");
  win.loadURL(url);

  return win;
};

app.whenReady().then(() => {
  createWindow("http://localhost:55969");
});

app.on("window-all-closed", () => {
  //   if (process.platform !== "darwin") app.quit();
  app.quit();
});
