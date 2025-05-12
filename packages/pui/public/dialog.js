import "./init.js";
const load = lm(import.meta);

load("../dialog/dialog.html");

const appendDialog = (code, clickYes, opened) => {
  return new Promise((resolve) => {
    const dialog = $(code);

    const closeDialog = () => {
      dialog.open = false;

      setTimeout(() => {
        dialog.remove();
      }, 400);
    };

    dialog.$(".dialog-yes-btn").on("click", () => {
      if (clickYes) {
        clickYes({ dialog, resolve });
      } else {
        resolve(true);
      }
      closeDialog();
    });
    dialog.$(".dialog-cancel-btn") &&
      dialog.$(".dialog-cancel-btn").on("click", () => {
        resolve(false);
        closeDialog();
      });
    dialog.on("click-mask", () => {
      resolve(null);
      closeDialog();
    });
    dialog.on("click-close", () => {
      resolve(null);
      closeDialog();
    });

    // setTimeout(, 100);
    requestAnimationFrame(() => {
      setTimeout(() => {
        dialog.open = true;
        if (opened) {
          opened({ dialog });
        } else {
          setTimeout(() => {
            dialog.$(".dialog-yes-btn").focus();
          }, 100);
        }
      }, 10);
    });

    $("body").push(dialog);
  });
};

export const fixOpts = (opts) => {
  if (typeof opts === "string") {
    opts = {
      title: "",
      content: opts,
    };
  }

  // 判断字符串内容是否带有注入脚本，如果有则将其转义
  Object.keys(opts).forEach((key) => {
    if (typeof opts[key] === "string") {
      if (opts[key].includes("<script")) {
        opts[key] = opts[key].replace(/<script/g, "&lt;script");
      }
    }
  });

  return opts;
};

export async function confirm(opts) {
  load("../dialog/dialog.html");

  opts = fixOpts(opts);

  return appendDialog(`
<p-dialog style="--dialog-width: 320px">
  <span slot="title">${opts.title || ""}</span>
  ${opts.content}
  <p-button slot="bottom" class="dialog-yes-btn">${opts.yes || "Yes"}</p-button>
  <p-button variant="text" class="dialog-cancel-btn" slot="bottom">${
    opts.cancel || "Cancel"
  }</p-button>
</p-dialog>`);
}

export async function alert(opts) {
  load("../dialog/dialog.html");

  opts = fixOpts(opts);

  return appendDialog(`
<p-dialog>
  <span slot="title">${opts.title}</span>
  ${opts.content}
  <p-button variant="text" class="dialog-yes-btn" slot="bottom">${
    opts.ok || "OK"
  }</p-button>
</p-dialog>`);
}

export async function prompt(opts) {
  load("../dialog/dialog.html");
  await load("../input/input.html");

  opts = fixOpts(opts);

  return appendDialog(
    `
<p-dialog>
  <span slot="title">${opts.title}</span>
  <div style="padding:8px 0">
    <p-input placeholder="${opts.placeholder || ""}" default-value="${
      opts.value || ""
    }" style="--label-bg:var(--md-sys-color-on-normal);width:100%;">
      ${opts.label ? `<label>${opts.label}</label>` : ""}
    </p-input>
  </div>
  <p-button slot="bottom" class="dialog-yes-btn">${opts.yes || "Yes"}</p-button>
  <p-button variant="text" class="dialog-cancel-btn" slot="bottom">${
    opts.cancel || "Cancel"
  }</p-button>
</p-dialog>`,
    ({ dialog, resolve }) => {
      resolve(dialog.$("p-input").value);
    },
    ({ dialog }) => {
      dialog.$("p-input").focus();

      dialog.$("p-input").on("keydown", (e) => {
        if (e.code === "Enter") {
          dialog.$(".dialog-yes-btn").click();
        }
      });
    }
  );
}

export default {
  confirm,
  alert,
  prompt,
};
