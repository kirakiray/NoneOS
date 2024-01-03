import open, { apps } from "open";
import "./static-server.js";

await open("http://127.0.0.1:5559", { app: { name: apps.chrome } });
