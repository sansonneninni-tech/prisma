/* Export MP4 nel browser: ogni fotogramma dell'originale + il testo, audio originale copiato senza ricodifica.
   1080×1350, 25 fps, H.264 16 Mbps (30 Mbps in modalità realtime se la qualità non è disponibile). */
import {
  Input, ALL_FORMATS, UrlSource, Output, Mp4OutputFormat, BufferTarget,
  CanvasSource, EncodedAudioPacketSource, EncodedPacketSink, VideoSampleSink,
} from 'mediabunny'
import { drawText, FRAME_W, FRAME_H } from './render.js'

const FPS = 25
export class ExportCanceled extends Error { constructor() { super('canceled'); this.name = 'ExportCanceled' } }
class ExportStalled extends Error { constructor() { super('stalled'); this.name = 'ExportStalled' } }
export const canExport = () => typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined' && typeof VideoFrame !== 'undefined'

async function pickCodec(bitrate, latencyMode) {
  const lvl = bitrate > 20e6 ? '29' : '28'
  for (const p of ['6400', '4d00', '42e0']) {
    const codec = `avc1.${p}${lvl}`
    try {
      const r = await VideoEncoder.isConfigSupported({ codec, width: FRAME_W, height: FRAME_H, bitrate, framerate: FPS, latencyMode })
      if (r.supported) return codec
    } catch { /* prova il profilo successivo */ }
  }
  return null
}
let qualityOk = null
async function qualityModeWorks() {
  if (qualityOk != null) return qualityOk
  qualityOk = await new Promise((res) => {
    let n = 0, done = false
    const finish = (v) => { if (!done) { done = true; try { enc.close() } catch { } res(v) } }
    const enc = new VideoEncoder({ output: () => { if (++n >= 8) finish(true) }, error: () => finish(false) })
    try {
      enc.configure({ codec: 'avc1.42e028', width: 320, height: 400, bitrate: 2e6, framerate: FPS, latencyMode: 'quality' })
      const cv = new OffscreenCanvas(320, 400), c = cv.getContext('2d')
      for (let i = 0; i < 8; i++) {
        c.fillStyle = `hsl(${i * 40},50%,50%)`; c.fillRect(0, 0, 320, 400)
        const fr = new VideoFrame(cv, { timestamp: i * 40000 }); enc.encode(fr, { keyFrame: i === 0 }); fr.close()
      }
      enc.flush().catch(() => finish(false))
    } catch { finish(false) }
    setTimeout(() => finish(false), 1500)
  })
  return qualityOk
}

export async function exportVideo({ url, state, onProgress = () => {}, signal }) {
  const plans = []
  if (await qualityModeWorks()) plans.push({ bitrate: 16e6, latencyMode: 'quality' })
  plans.push({ bitrate: 30e6, latencyMode: 'realtime' })
  let lastErr
  for (const plan of plans) {
    const codec = await pickCodec(plan.bitrate, plan.latencyMode)
    if (!codec) continue
    try { return await exportOnce({ url, state, onProgress, signal, codec, ...plan }) } catch (e) {
      if (!(e instanceof ExportStalled)) throw e
      lastErr = e; onProgress(0)
    }
  }
  throw lastErr || new Error('Nessun codec H.264 disponibile')
}

async function exportOnce({ url, state, onProgress, signal, codec, bitrate, latencyMode }) {
  const checkAbort = () => { if (signal?.aborted) throw new ExportCanceled() }
  checkAbort()
  const input = new Input({ source: new UrlSource(url), formats: ALL_FORMATS })
  let output = null, finished = false, timer = null
  try {
    const vTrack = await input.getPrimaryVideoTrack()
    const aTrack = await input.getPrimaryAudioTrack()
    const firstTs = await input.getFirstTimestamp()
    const duration = await input.computeDuration()
    const totalFrames = Math.max(1, Math.round((duration - firstTs) * FPS))
    const canvas = document.createElement('canvas'); canvas.width = FRAME_W; canvas.height = FRAME_H
    const ctx = canvas.getContext('2d', { alpha: false }); ctx.imageSmoothingQuality = 'high'
    output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() })
    const videoSource = new CanvasSource(canvas, { codec: 'avc', fullCodecString: codec, bitrate, keyFrameInterval: 2, latencyMode })
    output.addVideoTrack(videoSource, { frameRate: FPS })
    let audioSource = null, audioConfig = null
    if (aTrack) { audioConfig = await aTrack.getDecoderConfig(); audioSource = new EncodedAudioPacketSource(aTrack.codec); output.addAudioTrack(audioSource) }
    await output.start()
    checkAbort()

    let last = performance.now(), frames = 0, stalled = false
    const watchdog = new Promise((_, rej) => {
      timer = setInterval(() => {
        if (signal?.aborted) { clearInterval(timer); rej(new ExportCanceled()); return }
        const limit = frames === 0 ? 30000 : 8000
        if (performance.now() - last > limit) { stalled = true; clearInterval(timer); rej(new ExportStalled()) }
      }, 500)
    })
    const pumpVideo = (async () => {
      const sink = new VideoSampleSink(vTrack)
      for await (const sample of sink.samples()) {
        try {
          if (stalled) return
          checkAbort()
          ctx.drawImage(sample.toCanvasImageSource(), 0, 0, FRAME_W, FRAME_H)
          drawText(ctx, state, sample.timestamp - firstTs, 1)
          await videoSource.add(sample.timestamp - firstTs, sample.duration || 1 / FPS)
          frames++; last = performance.now()
          onProgress(Math.min(0.99, frames / totalFrames))
        } finally { sample.close() }
      }
    })()
    const pumpAudio = (async () => {
      if (!aTrack) return
      const sink = new EncodedPacketSink(aTrack)
      let first = true
      for await (const packet of sink.packets()) {
        checkAbort()
        await audioSource.add(packet, first ? { decoderConfig: audioConfig } : undefined)
        first = false
      }
    })()
    await Promise.race([Promise.all([pumpVideo, pumpAudio]), watchdog])
    clearInterval(timer)
    videoSource.close(); audioSource?.close()
    await output.finalize(); finished = true
    onProgress(1)
    return new Blob([output.target.buffer], { type: 'video/mp4' })
  } catch (e) {
    if (output && !finished) { try { await output.cancel() } catch { } }
    throw e
  } finally {
    clearInterval(timer)
    try { input.dispose?.() } catch { }
  }
}
