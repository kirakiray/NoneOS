Component(async ({ load }) => {
  await load("../icon-view -p");

  return {
    attrs: {
      name: "",
      selected: null,
      type: "",
      icontype: "",
    },
    data: {
      showname: "",
      renameMode: false,
    },
    watch: {
      name(name) {
        this.showname = name;
      },
      type(type) {
        if (type == "folder" || type == "dir") {
          this.icontype = "folder";
        } else {
          this.icontype = "file";
        }
      },
    },
    proto: {
      blurName(e) {
        debugger
        this.trigger("rename-block", {
          oldName: this.showname,
          name: e.target.value,
        });
      },
      focusInput() {
        $.nextTick(() => {
          this.shadow.$(".rename_inputer").ele.focus();
        });
      },
    },
  };
});
