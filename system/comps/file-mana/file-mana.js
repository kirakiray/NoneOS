Component(async ({ load }) => {
    await load("../entrance-block -p");
    const fs = await window.fs;

    return {
        data: {
            // 我的收藏的文件夹快捷方式
            favorite: [{
                name: "root",
                path: "/",
            }, {
                name: "可用空间",
                path: "/$",
            }, {
                name: "desktop",
                path: "/$/desktop"
            }, {
                name: "apps",
                path: "/$/apps"
            }],
            // 当前所在路径
            fpath: "/$",
            // 当前目录的所有文件
            content: [],
            // content: [{
            //     type: "file",
            //     name: "111111.jpg"
            // }, {
            //     type: "folder",
            //     name: "2222"
            // }],
            // 是否有选中文件
            hasSelected: false,
            // 多选模式
            multiSelectMode: false,
            // 历史记录
            history: ["/$"],
            // 当前属于历史记录的游标
            historyIndex: 0
        },
        watch: {
            // 当前路径下的所有文件
            content(content) {
                // 文件夹内可能会有很多文件
                // 相比fill，这种填充方式性能最好
                const con_ele = this.shadow.$(".con_main");

                if (content.length) {
                    let html = ``;
                    content.forEach(e => {
                        html += `<entrance-block name="${e.name}" type="${e.type}"></entrance-block>`;
                    });
                    con_ele.html = html;
                } else {
                    con_ele.html = `<div style="display:flex;justify-content:center;align-items:center;width:100%;height:100px;font-size:12px;color:#aaa;">空</div>`;
                }
            },
            // 修改当前路径
            // 只给 toPath back forword 使用
            // 请不要直接修改fpath，要通过 toPath方法进入新目录
            async fpath(fpath) {
                let data = await fs.read(fpath);
                this.content = data.content;
            }
        },
        proto: {
            // 进入某个目录
            // 所有递进都用这个方法，可以记录历史
            toPath(path) {
                if (this.fpath == path) {
                    // 相同的路径不折腾
                    return;
                }
                this.fpath = path;
                this.historyIndex++;
                this.history.splice(this.historyIndex, 100000, path);
                // this.hasSelected = false;
                // this.multiSelectMode = false;
                this.restore();
            },
            // 返回
            back() {
                if (this.history.length <= 1 || this.historyIndex <= 0) {
                    // 无效路径
                    return;
                }

                let targetPath = this.history[--this.historyIndex];
                this.fpath = targetPath;
            },
            // 前进
            forward() {
                if (this.historyIndex >= this.history.length - 1) {
                    return;
                }

                this.historyIndex++;

                let tpath = this.history[this.historyIndex];

                if (tpath) {
                    this.fpath = tpath;
                }
            },
            // 向上
            upPath() {
                if (this.fpath == "/") {
                    return;
                }

                this.toPath(this.fpath.replace(/(.*)\/.+/, "$1") || '/');
            },
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
            clickRename() {
                if (this.selecteds.length != 1) {
                    return;
                }

                this.selecteds[0].renameMode = true;
            },
            renameBlock(e) {
                let { name, oldName } = e.data;

                $(e.target).showname = name;
                this.restore();
            },
            // 添加文件夹
            addDir() {

            },
            // 添加文件
            addFile() {

            },
            // 还原所有状态
            restore() {
                if (this.selecteds.length == 1) {
                    this.selecteds[0].renameMode = false;
                }

                this.hasSelected = false;
                this.multiSelectMode = false;

                this.shadow.all("entrance-block").forEach(e => e.selected = null);
            },
            get selecteds() {
                return this.shadow.all(`entrance-block[selected="1"]`);
            }
        },
        ready() {
            // 选择文件
            const con_ele = this.shadow.$(".con_main");

            // 双击断定参数
            let click_start_time;
            let before_selector;

            con_ele.on("click", "entrance-block", e => {
                const selector = $(e.selector);

                let is_old_enter = before_selector === e.selector;
                before_selector = e.selector;

                if (!click_start_time) {
                    click_start_time = Date.now();
                } else {
                    let n_time = Date.now()
                    if (n_time - click_start_time < 180 && is_old_enter) {
                        // 属于双击
                        if (selector.type == "folder") {
                            if (this.fpath == '/') {
                                this.toPath(this.fpath + selector.name);
                            } else {
                                this.toPath(this.fpath + "/" + selector.name);
                            }
                        }

                        return;
                    }

                    // 更新时间
                    click_start_time = n_time;
                }

                // 阻止选择事件
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
                this.restore();
            });
        }
    };
});