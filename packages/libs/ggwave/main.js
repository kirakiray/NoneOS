import ggwave from "./ggwave.js";

/**
 * Converts a typed array to another typed array type
 * @param {TypedArray} src - Source typed array
 * @param {Function} type - Target typed array constructor (e.g., Float32Array)
 * @returns {TypedArray} Converted typed array
 */
function convertTypedArray(src, type) {
  const buffer = new ArrayBuffer(src.byteLength);
  const baseView = new src.constructor(buffer);
  baseView.set(src);
  return new type(buffer);
}

/**
 * Sends text as audio using ggwave
 * @param {string} text - Text to encode and send as audio
 * @returns {Promise<void>}
 */
export const send = async (text) => {
  // Input validation
  if (typeof text !== "string" || text.length === 0) {
    throw new Error("Text must be a non-empty string");
  }

  let context = null;
  let instance = null;

  try {
    // Create audio context with optimal settings
    context = new AudioContext({
      sampleRate: 48000,
      latencyHint: "interactive",
    });

    // Resume context if suspended (common in modern browsers)
    if (context.state === "suspended") {
      await context.resume();
    }

    // Initialize ggwave with context parameters
    const parameters = ggwave.getDefaultParameters();
    parameters.sampleRateInp = context.sampleRate;
    parameters.sampleRateOut = context.sampleRate;
    instance = ggwave.init(parameters);

    // Encode the text to waveform
    const waveform = ggwave.encode(
      instance,
      text,
      ggwave.ProtocolId.GGWAVE_PROTOCOL_AUDIBLE_FASTEST,
      10
    );

    if (!waveform || waveform.length === 0) {
      throw new Error("Failed to encode text to waveform");
    }

    // Convert waveform to Float32Array and create audio buffer
    const float32Array = convertTypedArray(waveform, Float32Array);
    const audioBuffer = context.createBuffer(
      1,
      float32Array.length,
      context.sampleRate
    );
    audioBuffer.getChannelData(0).set(float32Array);

    // Create and configure audio source
    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(context.destination);

    // Start playback
    source.start(0);

    // Wait for playback to complete before cleaning up
    return new Promise((resolve, reject) => {
      source.onended = () => {
        try {
          // Clean up resources
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
        reject(new Error(`Audio playback failed: ${error.message}`));
      };
    });
  } catch (error) {
    // Clean up resources on error
    if (instance) {
      try {
        ggwave.free(instance);
      } catch (cleanupError) {
        console.warn("Failed to free ggwave instance:", cleanupError);
      }
    }

    if (context) {
      try {
        context.close();
      } catch (cleanupError) {
        console.warn("Failed to close audio context:", cleanupError);
      }
    }

    throw error;
  }
};
