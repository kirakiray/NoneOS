Component(async ({ load }) => {
  await load("../icon-view -p");

  return {
    attrs: {
      name: "",
      selected: null,
      type: "",
      // icon的类型
      icontype: "",
      // 是否重命名状态
      renameMode: false,
    },
    data: {
      showname: "",
      // 重命名状态
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
          // 根据不同file又能展开显示图标
          this.icontype = "file";
        }
      },
    },
    proto: {
      blurName(e) {
        // this.name = e.target.value;
        this.trigger("rename-block", {
          oldName: this.showname,
          name: e.target.value,
        });
      },
    },
  };
});
