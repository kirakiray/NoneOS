(() => {
    const filedb = new Promise((resolve, reject) => {
        // 根据id获取数据库
        let req = indexedDB.open("noneos_files");

        req.onsuccess = (e) => {
            //获取数据库
            let db = e.target.result;

            resolve(db);
        };

        // 创建时生成仓库
        req.onupgradeneeded = (e) => {
            // 保存 IDBDataBase 接口
            let db = e.target.result;

            // 为该数据库创建一个对象仓库
            db.createObjectStore("main", { keyPath: "path" });
        };

        req.onerror = (event) => {
            throw {
                desc: "数据创建出错",
                event
            };
        };
    });

    // 写入文件
    const write = async (opts) => {
        // const defs = {
        //     // 路径
        //     path: "",
        //     // 类型
        //     type: "file",
        //     // 保存内容
        //     content: ""
        // };

        const db = await filedb;

        return new Promise((resolve, reject) => {
            let req = db.transaction(["main"], "readwrite")
                .objectStore("main")
                .put(opts);

            req.onsuccess = (e) => {
                resolve(true);
            }
            req.onerror = (err) => {
                reject(err);
            }
        });
    }

    // 读取文件
    const read = async (path) => {
        const db = await filedb;

        return new Promise((resolve, reject) => {
            let req = db.transaction(["main"], "readonly")
                .objectStore("main")
                .get(path);

            req.onsuccess = (e) => {
                resolve(e.target.result);
            }
            req.onerror = (err) => {
                reject(err);
            }
        });
    }

    const remove = async (path) => {
        const db = await filedb;

        return new Promise((resolve, reject) => {
            let req = db.transaction(["main"], "readwrite")
                .objectStore("main")

            req.onsuccess = (e) => {
                resolve(true);
            }
            req.onerror = (e) => {
                reject(e);
            }

            if (key instanceof Array) {
                key.forEach(k => req.delete(k));
            } else {
                req.delete(path)
            }
        });
    }

    const rename = async (path, newName) => {
        const db = await filedb;

        return new Promise((resolve, reject) => {
            let req = db.transaction(["main"], "readwrite")
                .objectStore("main")

            req.onsuccess = (e) => {
                resolve(true);
            }
            req.onerror = (e) => {
                reject(e);
            }

            if (key instanceof Array) {
                key.forEach(k => req.delete(k));
            } else {
                req.delete(path)
            }
        });
    }

    // 添加新人套餐
    const inited = (async () => {
        let data = await read("/");

        if (!data) {
            // 最初始文件目录
            const initFiles = [{
                path: "/",
                type: "folder",
                content: [{
                    name: "$",
                    type: "folder",
                    // 拒绝操作的权限
                    // d 为不可删除(delete)，也代表不可剪切和改名；
                    // n为不可新增(new)，就是不可在该目录下导入文件或新建文件夹
                    refuse: ['d', "n"]
                }]
            }, {
                path: "/$",
                type: "folder",
                refuse: ['d', "n"],
                content: [{
                    name: "desktop",
                    type: "folder",
                    refuse: ['d']
                }, {
                    name: "apps",
                    type: "folder",
                    refuse: ['d']
                }]
            }, {
                path: "/$/desktop",
                type: "folder",
                refuse: ['d'],
                content: [{
                    name: "test.txt",
                    type: "file"
                }]
            }, {
                path: "/$/apps",
                type: "folder",
                refuse: ['d'],
                content: []
            }, {
                path: "/$/desktop/test.txt",
                type: "file",
                content: new File(["test txt"], "test.txt")
            }];

            // 没有初始化过的话，直接写入文件
            await Promise.all(initFiles.map(d => write(d)));
        }

        return true;
    })();


    globalThis.fs = new Promise(res => {
        inited.then(e => {
            res({
                write, read, remove, rename
            });
        });
    });
})();