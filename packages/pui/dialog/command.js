let maskId = 10001;

const load = lm(import.meta);

load("./dialog.html");

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

export async function confirm(opts) {
  await load("./dialog.html");

  return appendDialog(`
<p-dialog fullscreen="540" style="--dialog-width: 320px">
  <span slot="title">${opts.title || ""}</span>
  ${opts.content}
  <p-button slot="bottom" class="dialog-yes-btn">${opts.yes || "Yes"}</p-button>
  <p-button variant="text" class="dialog-cancel-btn" slot="bottom">${
    opts.cancel || "Cancel"
  }</p-button>
</p-dialog>`);
}

export async function alert(opts) {
  await load("./dialog.html");

  return appendDialog(`
<p-dialog fullscreen="540">
  <span slot="title">${opts.title}</span>
  ${opts.content}
  <p-button variant="text" class="dialog-yes-btn" slot="bottom">${
    opts.ok || "OK"
  }</p-button>
</p-dialog>`);
}

export async function prompt(opts) {
  await load("./dialog.html");
  await load("../text-field/text-field.html");

  return appendDialog(
    `
<p-dialog fullscreen="540">
  <span slot="title">${opts.title}</span>
  <div style="padding:8px 0">
    <p-text-field style="--label-bg:var(--md-sys-color-on-normal);width:100%;">
      ${opts.label ? `<label>${opts.label}</label>` : ""}
    </p-text-field>
  </div>
  <p-button slot="bottom" class="dialog-yes-btn">${opts.yes || "Yes"}</p-button>
  <p-button variant="text" class="dialog-cancel-btn" slot="bottom">${
    opts.cancel || "Cancel"
  }</p-button>
</p-dialog>`,
    ({ dialog, resolve }) => {
      resolve(dialog.$("p-text-field").value);
    },
    ({ dialog }) => {
      dialog.$("p-text-field").focus();

      dialog.$("p-text-field").on("keydown", (e) => {
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
  get maskId() {
    return maskId;
  },
  set maskId(val) {
    maskId = val;
  },
};
