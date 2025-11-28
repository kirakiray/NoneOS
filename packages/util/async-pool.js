/**
 * 并发控制函数 - 限制异步回调的并发数量
 * @param {Array} array - 要遍历的数组
 * @param {Function} callback - 异步回调函数，接收(item, index, array)参数
 * @param {number} [concurrency=2] - 最大并发数，默认为2
 * @returns {Promise<Array>} 所有处理结果的Promise数组
 */
export async function asyncPool(array, callback, concurrency = 2) {
  const results = [];
  const executing = [];

  for (const [index, item] of array.entries()) {
    // 立即调用回调创建Promise，但执行受并发控制
    const promise = Promise.resolve().then(() => callback(item, index, array));
    results.push(promise);

    // 如果达到并发限制，等待最快完成的那个任务
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }

    // 将当前任务加入执行队列，并在完成后自动移除
    const execution = promise
      .then(() => {
        executing.splice(executing.indexOf(execution), 1);
      })
      .catch(() => {
        executing.splice(executing.indexOf(execution), 1);
      });
    executing.push(execution);
  }

  // 等待所有任务完成并返回结果
  return Promise.all(results);
}

// 使用示例
// async function test() {
//   const items = [1, 2, 3, 4, 5];

//   // 模拟异步任务
//   const process = async (item) => {
//     console.log(`开始处理: ${item}`);
//     await new Promise((resolve) => setTimeout(resolve, 1000)); // 模拟1秒耗时
//     console.log(`完成处理: ${item}`);
//     return item * 2;
//   };

//   try {
//     const results = await asyncPool(items, process, 2);
//     console.log("所有结果:", results); // [2, 4, 6, 8, 10]
//   } catch (error) {
//     console.error("处理失败:", error);
//   }
// }

// 运行测试
// test();
