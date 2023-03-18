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
        }
        if (type) {
          this.icontype = type;
        } else {
          this.icontype = "file";
        }
      },
    },
    proto: {
      blurName(e) {
        this.trigger("rename-block", {
          oldName: this.showname,
          name: e.target.value,
          type: this.type,
        });
      },
      toRename() {
        this.renameMode = 1;
        $.nextTick(() => {
          this.shadow.$(".rename_inputer").ele.focus();
        });
      },
    },
  };
});
