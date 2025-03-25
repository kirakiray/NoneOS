# cache handle

基于 CacheStorage 构建的文件系统，用于替换 db-handle；

因为db-handle在safari下，始终会有些莫名其妙的问题，估计是safari底层对indexdb实现不好。