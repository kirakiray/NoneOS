# cache handle

基于 CacheStorage 构建的文件系统，用于替换 db-handle；

因为db-handle在safari下，始终会有些莫名其妙的问题，估计是safari底层对indexdb实现不好。

太糟糕了，safari下使用 c-handle 会有读取文件失败的问题。还得想办法。