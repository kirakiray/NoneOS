// 使用ggwave库将文本编码为音频波形的相关库
import ggwave from "./ggwave.js";

// 实时捕获音频，并将其转换为字符
export const capture = async () => {
  let context = null;
  let instance = null;
  let recorder = null;
  let mediaStream = null;
  let isCapturing = false;

  try {
    // 创建音频上下文
    context = new AudioContext({
      sampleRate: 48000,
      latencyHint: "interactive",
    });

    // 如果音频上下文被暂停，则恢复它
    if (context.state === "suspended") {
      await context.resume();
    }

    // 初始化 ggwave
    const parameters = ggwave.getDefaultParameters();
    parameters.sampleRateInp = context.sampleRate;
    parameters.sampleRateOut = context.sampleRate;
    instance = ggwave.init(parameters);

    let constraints = {
      audio: {
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression: false,
      },
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    mediaStream = context.createMediaStreamSource(stream);

    const bufferSize = 1024;
    const numberOfInputChannels = 1;
    const numberOfOutputChannels = 1;

    if (context.createScriptProcessor) {
      recorder = context.createScriptProcessor(
        bufferSize,
        numberOfInputChannels,
        numberOfOutputChannels
      );
    } else {
      recorder = context.createJavaScriptNode(
        bufferSize,
        numberOfInputChannels,
        numberOfOutputChannels
      );
    }

    const target = new EventTarget();

    recorder.onaudioprocess = function (e) {
      var source = e.inputBuffer;
      var res = ggwave.decode(
        instance,
        convertTypedArray(new Float32Array(source.getChannelData(0)), Int8Array)
      );

      if (res && res.length > 0) {
        res = new TextDecoder("utf-8").decode(res);
        console.log("Received:", res);

        // 触发自定义事件，让外部可以监听接收到的消息
        window.dispatchEvent(
          new CustomEvent("ggwave-message", {
            detail: { message: res, timestamp: Date.now() },
          })
        );
      }
    };

    mediaStream.connect(recorder);
    recorder.connect(context.destination);

    isCapturing = true;
    console.log("GGWave capture started");

    Object.assign(target, {
      stop: async () => {
        if (!isCapturing) return;

        isCapturing = false;

        if (recorder) {
          recorder.disconnect();
          recorder.onaudioprocess = null;
        }

        if (mediaStream) {
          mediaStream.disconnect();
        }

        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        if (instance) {
          ggwave.free(instance);
        }

        if (context) {
          await context.close();
        }

        console.log("GGWave capture stopped");
      },
      isCapturing: () => isCapturing,
    });

    // 返回清理函数
    return target;
  } catch (error) {
    // 出错时清理资源
    if (recorder) {
      recorder.disconnect();
      recorder.onaudioprocess = null;
    }

    if (mediaStream) {
      mediaStream.disconnect();
    }

    if (instance) {
      try {
        ggwave.free(instance);
      } catch (cleanupError) {
        console.warn("释放 ggwave 实例失败:", cleanupError);
      }
    }

    if (context) {
      try {
        await context.close();
      } catch (cleanupError) {
        console.warn("关闭音频上下文失败:", cleanupError);
      }
    }

    throw new Error(`音频捕获初始化失败: ${error.message}`);
  }
};

/**
 * 将类型化数组转换为另一种类型化数组类型
 * @param {TypedArray} src - 源类型化数组
 * @param {Function} type - 目标类型化数组构造函数（例如 Float32Array）
 * @returns {TypedArray} 转换后的类型化数组
 */
function convertTypedArray(src, type) {
  const buffer = new ArrayBuffer(src.byteLength);
  const baseView = new src.constructor(buffer);
  baseView.set(src);
  return new type(buffer);
}

/**
 * 使用 ggwave 将文本作为音频发送
 * @param {string} text - 要编码并发送为音频的文本
 * @param {number} volume - 音量级别（0.0 到 1.0，默认：1.0 为最大音量）
 * @returns {Promise<void>}
 */
export const send = async (text, volume = 1.0) => {
  // 输入验证
  if (typeof text !== "string" || text.length === 0) {
    throw new Error("文本必须是非空字符串");
  }

  // 音量验证
  if (typeof volume !== "number" || volume < 0 || volume > 1) {
    throw new Error("音量必须是 0.0 到 1.0 之间的数字");
  }

  let context = null;
  let instance = null;

  try {
    // 创建具有最佳设置的音频上下文
    context = new AudioContext({
      sampleRate: 48000,
      latencyHint: "interactive",
    });

    // 如果音频上下文被暂停，则恢复它（在现代浏览器中很常见）
    if (context.state === "suspended") {
      await context.resume();
    }

    // 使用上下文参数初始化 ggwave
    const parameters = ggwave.getDefaultParameters();
    parameters.sampleRateInp = context.sampleRate;
    parameters.sampleRateOut = context.sampleRate;
    instance = ggwave.init(parameters);

    // 将文本编码为波形
    const waveform = ggwave.encode(
      instance,
      text,
      ggwave.ProtocolId.GGWAVE_PROTOCOL_AUDIBLE_FASTEST,
      10
    );

    if (!waveform || waveform.length === 0) {
      throw new Error("无法将文本编码为波形");
    }

    // 将波形转换为 Float32Array 并应用音量/标准化
    const float32Array = convertTypedArray(waveform, Float32Array);

    // 标准化到最大范围并应用音量
    let maxValue = 0;
    for (let i = 0; i < float32Array.length; i++) {
      const absValue = Math.abs(float32Array[i]);
      if (absValue > maxValue) {
        maxValue = absValue;
      }
    }

    if (maxValue > 0) {
      const normalizationFactor = (0.95 * volume) / maxValue; // 0.95 以防止削波
      for (let i = 0; i < float32Array.length; i++) {
        float32Array[i] = float32Array[i] * normalizationFactor;
      }
    }

    const audioBuffer = context.createBuffer(
      1,
      float32Array.length,
      context.sampleRate
    );
    audioBuffer.getChannelData(0).set(float32Array);

    // 创建并配置具有增益节点的音频源以实现最大音量
    const source = context.createBufferSource();
    const gainNode = context.createGain();

    source.buffer = audioBuffer;

    // 连接源 -> 增益节点 -> 目标以进行音量控制
    source.connect(gainNode);
    gainNode.connect(context.destination);

    // 设置增益为最大值（1.0），因为我们已经对音频数据进行了标准化
    gainNode.gain.value = 1.0;

    // 开始播放
    source.start(0);

    // 等待播放完成后再清理资源
    return new Promise((resolve, reject) => {
      source.onended = () => {
        try {
          // 清理资源
          if (instance) {
            ggwave.free(instance);
          }
          if (context) {
            context.close();
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      source.onerror = (error) => {
        reject(new Error(`音频播放失败: ${error.message}`));
      };
    });
  } catch (error) {
    // 出错时清理资源
    if (instance) {
      try {
        ggwave.free(instance);
      } catch (cleanupError) {
        console.warn("释放 ggwave 实例失败:", cleanupError);
      }
    }

    if (context) {
      try {
        context.close();
      } catch (cleanupError) {
        console.warn("关闭音频上下文失败:", cleanupError);
      }
    }

    throw error;
  }
};
