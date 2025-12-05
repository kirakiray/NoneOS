import ggwave from "./ggwave.js";

/**
 * 将类型化数组转换为另一种类型化数组类型
 * @param {TypedArray} src - 源类型化数组
 * @param {Function} type - 目标类型化数组构造函数（例如 Float32Array）
 * @returns {TypedArray} 转换后的类型化数组
 */
export function convertTypedArray(src, type) {
  const buffer = new ArrayBuffer(src.byteLength);
  const baseView = new src.constructor(buffer);
  baseView.set(src);
  return new type(buffer);
}
/**
 * GGWave 接收器类，用于捕获音频并将其转换为文本消息
 */
export class GgwaveReceiver extends EventTarget {
  constructor() {
    super();
    this.context = null;
    this.instance = null;
    this.recorder = null;
    this.mediaStream = null;
    this._isCapturing = false; // 使用私有属性避免命名冲突
  }

  /**
   * 开始捕获音频
   * @returns {Promise<void>}
   */
  async start() {
    if (this._isCapturing) {
      console.warn("GGWave capture is already running");
      return;
    }

    try {
      // 创建音频上下文
      this.context = new AudioContext({
        sampleRate: 48000,
        latencyHint: "interactive",
      });

      // 如果音频上下文被暂停，则恢复它
      if (this.context.state === "suspended") {
        await this.context.resume();
      }

      // 初始化 ggwave
      const parameters = ggwave.getDefaultParameters();
      parameters.sampleRateInp = this.context.sampleRate;
      parameters.sampleRateOut = this.context.sampleRate;
      this.instance = ggwave.init(parameters);

      let constraints = {
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream = stream; // 保存原始的 MediaStream 对象
      this.mediaStream = this.context.createMediaStreamSource(stream);

      const bufferSize = 1024;
      const numberOfInputChannels = 1;
      const numberOfOutputChannels = 1;

      if (this.context.createScriptProcessor) {
        this.recorder = this.context.createScriptProcessor(
          bufferSize,
          numberOfInputChannels,
          numberOfOutputChannels
        );
      } else {
        this.recorder = this.context.createJavaScriptNode(
          bufferSize,
          numberOfInputChannels,
          numberOfOutputChannels
        );
      }

      this.recorder.onaudioprocess = (e) => {
        var source = e.inputBuffer;
        var res = ggwave.decode(
          this.instance,
          convertTypedArray(
            new Float32Array(source.getChannelData(0)),
            Int8Array
          )
        );

        if (res && res.length > 0) {
          res = new TextDecoder("utf-8").decode(res);
          console.log("Received:", res);

          // 触发自定义事件，让外部可以监听接收到的消息
          this.dispatchEvent(
            new CustomEvent("ggwave-message", {
              detail: { message: res, timestamp: Date.now() },
            })
          );
        }
      };

      this.mediaStream.connect(this.recorder);
      this.recorder.connect(this.context.destination);

      this._isCapturing = true;
      console.log("GGWave capture started");
    } catch (error) {
      // 出错时清理资源
      this.cleanupOnError();
      throw new Error(`音频捕获初始化失败: ${error.message}`);
    }
  }

  /**
   * 停止捕获音频
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this._isCapturing) return;

    this._isCapturing = false;

    if (this.recorder) {
      this.recorder.disconnect();
      this.recorder.onaudioprocess = null;
    }

    if (this.mediaStream) {
      this.mediaStream.disconnect();
    }

    if (this.stream) {
      // 停止所有媒体流轨道，这是解决浏览器显示录制中状态的关键
      this.stream.getTracks().forEach((track) => {
        track.stop();
      });
      this.stream = null; // 清除引用
    }

    if (this.instance) {
      ggwave.free(this.instance);
      this.instance = null; // 清除引用
    }

    if (this.context) {
      await this.context.close();
      this.context = null; // 清除引用
    }

    // 清除其他引用
    this.mediaStream = null;
    this.recorder = null;

    console.log("GGWave capture stopped");
  }

  /**
   * 检查是否正在捕获音频
   * @returns {boolean}
   */
  isCapturing() {
    return this._isCapturing;
  }

  /**
   * 发生错误时清理资源
   * @private
   */
  cleanupOnError() {
    if (this.recorder) {
      this.recorder.disconnect();
      this.recorder.onaudioprocess = null;
    }

    if (this.mediaStream) {
      this.mediaStream.disconnect();
    }

    if (this.stream) {
      // 停止所有媒体流轨道
      this.stream.getTracks().forEach((track) => {
        track.stop();
      });
      this.stream = null; // 清除引用
    }

    if (this.instance) {
      try {
        ggwave.free(this.instance);
      } catch (cleanupError) {
        console.warn("释放 ggwave 实例失败:", cleanupError);
      }
      this.instance = null; // 清除引用
    }

    if (this.context) {
      try {
        this.context.close();
      } catch (cleanupError) {
        console.warn("关闭音频上下文失败:", cleanupError);
      }
      this.context = null; // 清除引用
    }
    
    // 清除其他引用
    this.mediaStream = null;
    this.recorder = null;
  }
}
