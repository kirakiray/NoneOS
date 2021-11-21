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
        db.createObjectStore("main", { keyPath: "key" });
    };

    req.onerror = (event) => {
        throw {
            desc: "数据创建出错",
            evenet
        };
    };
});

// 写入文件
const write = async (opts) => {
    const defs = {
        // 路径
        path: "",
        // 类型
        type: "file",
        // 保存内容
        content: ""
    };

    let db = await filedb;

    return new Promise((resolve, reject) => {
        let req = db.transaction(["main"], "readwrite")
            .objectStore("main")
            .put({ key, value });

        req.onsuccess = (e) => {
            resolve(true);
        }
        req.onerror = (e) => {
            reject(e);
        }
    });

}

// 读取文件
const read = async (path) => {

}