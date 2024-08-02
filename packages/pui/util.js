import dialogUtil from "./dialog/command.js";
import enqueue from "./snackbar/enqueue.js";

export const confirm = dialogUtil.confirm;
export const alert = dialogUtil.alert;
export const prompt = dialogUtil.prompt;

export { enqueue };
