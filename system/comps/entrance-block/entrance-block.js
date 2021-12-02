Component(async ({ load }) => {
    await load("../icon-view -p");

    return {
        attrs: {
            // 文件名
            name: "",
            // 选中
            selected: null,
            // 类型
            type: "",
            // icon的类型
            icontype: "",
            // 是否重命名状态
            renameMode: false
        },
        data: {
            showname: "",
            // 重命名状态
            renameMode: false
        },
        watch: {
            name(name) {
                this.showname = name;
            },
            type(type) {
                if (type == 'folder') {
                    this.icontype = "folder";
                } else {
                    // 根据不同file又能展开显示图标
                    this.icontype = "file";
                }
            }
        },
        proto: {
            blurName(e) {
                // this.name = e.target.value;
                this.trigger("rename-block", {
                    oldName: this.showname,
                    name: e.target.value
                });
            }
        }
    };
})