import { promises as fs } from "fs";

await fs.cp("../Punch-UI/packages", "packages/pui");
