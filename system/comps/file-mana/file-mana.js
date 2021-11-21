Component(async ({ load }) => {
    await load("../entrance-block -p");

    return {
        data: {
            // 我的收藏的文件夹快捷方式
            favorite: [{
                name: "root",
                path: "/",
            }, {
                name: "可用空间",
                path: "/$/",
            }, {
                name: "desktop",
                path: "/$/desktop/"
            }, {
                name: "app",
                path: "/$/app/"
            }],
            // 当前所在路径
            fpath: "/$/desktop/",
            // 当前目录的所有文件
            content: [{
                type: "file",
                name: "111111.jpg"
            }, {
                type: "folder",
                name: "2222"
            }],
            // 是否有选中文件
            hasSelected: false,
            // 多选模式
            multiSelectMode: false
        },
        watch: {
            content(content) {
                // 文件夹内可能会有很多文件
                // 相比fill，这种填充方式性能最好
                const con_ele = this.shadow.$(".con_main");

                let html = ``;

                content.forEach(e => {
                    html += `<entrance-block name="${e.name}" type="${e.type}"></entrance-block>`;
                });

                con_ele.html = html;
            }
        },
        proto: {
            // 多选模式
            toMultiSelect() {
                if (!this.multiSelectMode) {
                    this.multiSelectMode = true;
                } else {
                    // 取消多选模式
                    this.shadow.all('entrance-block').forEach(e => {
                        e.selected = null;
                    });
                    this.hasSelected = false;
                    this.multiSelectMode = false;
                }
            },
            // 添加文件夹
            addDir() {

            },
            // 添加文件
            addFile() {

            },
            get selecteds() {
                return this.shadow.all(`entrance-block[selected="1"]`);
            }
        },
        ready() {
            // 选择文件
            const con_ele = this.shadow.$(".con_main");

            con_ele.on("click", "entrance-block", e => {
                const selector = $(e.selector);

                // 组织选择事件
                e.stopImmediatePropagation()

                if (!this.multiSelectMode) {
                    let s_ele = this.shadow.$(`entrance-block[selected="1"]`);
                    if (s_ele) {
                        s_ele.selected = null;
                    }
                    selector.selected = 1;
                } else {
                    selector.selected = selector.selected ? null : 1;
                }

                $.nextTick(() => {
                    this.hasSelected = !!this.selecteds.length;
                });
            });

            con_ele.on("click", e => {
                console.log("click me =>", e);
                this.hasSelected = false;
                this.multiSelectMode = false;

                this.shadow.all("entrance-block").forEach(e => e.selected = null);
            });
        }
    };
});