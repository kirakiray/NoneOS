import { init } from "/packages/fs/main.js";
import { runTest } from "/tests/runTest.js";
import { createData } from "/packages/hybird-data/main.js";

const TEST_DIR = "test-dir10";
const STORAGE_KEY = "_d1_inited";

async function initializeData() {
  const testDirectory = await init(TEST_DIR);
  console.log("testDirectory: ", testDirectory);

  const testData1 = await testDirectory.get("test-data-1", {
    create: "dir",
  });

  console.log("testData1: ", testData1);

  const data1 = await createData(testData1);
  await data1.ready();

  return { testData1, data1 };
}

await runTest("sub data can save", async () => {
  try {
    {
      const { data1 } = await initializeData();

      if (!sessionStorage[STORAGE_KEY]) {
        data1.val = "I am data1";
        data1.subdata = {
          val: "I am subdata",
        };
        // 等待保存F
        await new Promise((res) => setTimeout(res, 800));

        // // safari隐私模式下，无法保存数据，不能使用刷新的方式测试
        // sessionStorage[STORAGE_KEY] = "1";
        // await new Promise((res) => setTimeout(res, 800));
        // location.reload();
        // return {
        //   assert: false,
        //   content: "waiting for save",
        // };
      }
    }

    // 第二次获取数据，理应获取已保存的
    const { data1 } = await initializeData();

    if (data1.subdata) {
      await data1.subdata.ready();
    }

    const isDataValid =
      data1.val === "I am data1" && data1.subdata.val === "I am subdata";

    return {
      assert: isDataValid,
      content: `check data saved : ${JSON.stringify(data1)}`,
    };
  } catch (error) {
    console.error("Test failed:", error);
    return {
      assert: false,
      content: `Test failed: ${error.message}`,
    };
  }
});

const endMessage = document.createElement("h5");
endMessage.setAttribute("data-testid", "all-test-completed");
endMessage.textContent = "All tests completed";
document.body.appendChild(endMessage);
