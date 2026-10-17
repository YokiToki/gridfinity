/** Кандидаты PoC. Ревизии закреплены (commit hash); размеры из API Hugging Face. */
export interface Candidate {
  id: string
  label: string
  url: string
  bytes: number
  license: string
  size: number
  mean: [number, number, number]
  std: [number, number, number]
  /** Нужно ли применять sigmoid к выходу (логиты). */
  sigmoid: boolean
  /** Имя входа/выхода (null — первый). */
  input?: string
  /** Только для сравнения качества: лицензия не позволяет включить в проект. */
  referenceOnly?: boolean
}
const hf = (repo: string, rev: string, file: string) => `https://huggingface.co/${repo}/resolve/${rev}/${file}`
const IMNET = { mean: [0.485, 0.456, 0.406] as [number, number, number], std: [0.229, 0.224, 0.225] as [number, number, number] }
const ZERO = { mean: [0, 0, 0] as [number, number, number], std: [1, 1, 1] as [number, number, number] }
const HALF = { mean: [0.5, 0.5, 0.5] as [number, number, number], std: [1, 1, 1] as [number, number, number] }

export const CANDIDATES: Candidate[] = [
  { id: 'birefnet-lite-fp16', label: 'BiRefNet-lite fp16 (MIT, 114 МБ)', url: hf('onnx-community/BiRefNet_lite-ONNX', 'de15b22ba131738a16dff04aab8bdf8dc32e3ac1', 'onnx/model_fp16.onnx'), bytes: 114538221, license: 'MIT', size: 1024, ...IMNET, sigmoid: true },
  { id: 'birefnet-lite-fp32', label: 'BiRefNet-lite fp32 (MIT, 224 МБ)', url: hf('onnx-community/BiRefNet_lite-ONNX', 'de15b22ba131738a16dff04aab8bdf8dc32e3ac1', 'onnx/model.onnx'), bytes: 224005088, license: 'MIT', size: 1024, ...IMNET, sigmoid: true },
  { id: 'isnet-general-q', label: 'ISNet general int8 (Apache-2.0, 46 МБ)', url: hf('Ko033/isnet-general-use-onnx', '5349b617911fd60c619b52f32e2b593517b78df3', 'onnx/model_quantized.onnx'), bytes: 45902969, license: 'Apache-2.0', size: 1024, ...HALF, sigmoid: false },
  { id: 'u2netp', label: 'U²-Net-P (Apache-2.0, 4.6 МБ)', url: hf('Heliosoph/u2net-onnx', '7fc34deee10329bc039c10a73b98090d0c6f5c59', 'u2netp.onnx'), bytes: 4574861, license: 'Apache-2.0', size: 320, ...IMNET, sigmoid: false },
  { id: 'rmbg14-q', label: 'RMBG-1.4 int8 (Bria, NON-COMMERCIAL, 44 МБ) — эталон качества', url: hf('briaai/RMBG-1.4', '2ceba5a5efaec153162aedea169f76caf9b46cf8', 'onnx/model_quantized.onnx'), bytes: 44403226, license: 'bria-rmbg-1.4 (non-commercial)', size: 1024, ...HALF, sigmoid: false, referenceOnly: true },
  // второй раунд поиска (permissive-лицензии, ревизии закреплены)
  { id: 'birefnet-lite-512-fp16', label: 'BiRefNet-lite 512 fp16 (MIT, 98 МБ)', url: hf('studioludens/birefnet-lite-512', '962e67969ec6acec9c19fab76acee4f5e22e990c', 'onnx/model_fp16.onnx'), bytes: 98484532, license: 'MIT', size: 512, ...IMNET, sigmoid: true },
  { id: 'birefnet-lite-512-fp32', label: 'BiRefNet-lite 512 fp32 (MIT, 192 МБ)', url: hf('studioludens/birefnet-lite-512', '962e67969ec6acec9c19fab76acee4f5e22e990c', 'onnx/model.onnx'), bytes: 191877254, license: 'MIT', size: 512, ...IMNET, sigmoid: true },
  { id: 'ormbg-int8', label: 'ormbg int8 (Apache-2.0, 44 МБ)', url: hf('onnx-community/ormbg-ONNX', '034e2d884afbab897e10e78fc5bb566b29533fd6', 'onnx/model_int8.onnx'), bytes: 44315136, license: 'Apache-2.0', size: 1024, ...ZERO, sigmoid: false },
  { id: 'ormbg-fp16', label: 'ormbg fp16 (Apache-2.0, 88 МБ)', url: hf('onnx-community/ormbg-ONNX', '034e2d884afbab897e10e78fc5bb566b29533fd6', 'onnx/model_fp16.onnx'), bytes: 88117930, license: 'Apache-2.0', size: 1024, ...ZERO, sigmoid: false },
  { id: 'mvanet-q4f16', label: 'MVANet q4f16 (MIT, 85 МБ)', url: hf('onnx-community/MVANet-ONNX', '43ec3427514b8d9164eea02df93ca2f1b036bb7b', 'onnx/model_q4f16.onnx'), bytes: 85027081, license: 'MIT', size: 1024, ...IMNET, sigmoid: true },
  { id: 'mvanet-int8', label: 'MVANet int8 (MIT, 141 МБ)', url: hf('onnx-community/MVANet-ONNX', '43ec3427514b8d9164eea02df93ca2f1b036bb7b', 'onnx/model_int8.onnx'), bytes: 141076192, license: 'MIT', size: 1024, ...IMNET, sigmoid: true },
  { id: 'ben2-fp16', label: 'BEN2 fp16 (MIT, 219 МБ)', url: hf('onnx-community/BEN2-ONNX', 'c552aa82688edce09f0ac9d2e31ad53d9d629010', 'onnx/model_fp16.onnx'), bytes: 219121675, license: 'MIT', size: 1024, ...IMNET, sigmoid: true },
]
