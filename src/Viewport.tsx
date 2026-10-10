import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Manifold } from 'manifold-3d'

export interface BuildPlate { x: number; y: number }

interface Api {
  setModel: (m: Manifold | null) => void
  setPlate: (p: BuildPlate | null) => void
  fit: () => void
}

const GIZMO_SIZE = 120
const AXES = [
  { label: 'X', dir: [1, 0, 0], color: 0xe5484d },
  { label: 'Y', dir: [0, 1, 0], color: 0x46c35f },
  { label: 'Z', dir: [0, 0, 1], color: 0x3b82f6 },
] as const

function labelSprite(text: string, color: number, filled: boolean) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const css = '#' + color.toString(16).padStart(6, '0')
  g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2)
  if (filled) { g.fillStyle = css; g.fill() } else { g.globalAlpha = 0.55; g.fillStyle = css; g.fill(); g.globalAlpha = 1 }
  if (text) { g.fillStyle = '#fff'; g.font = 'bold 34px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 32, 34) }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }))
  s.scale.setScalar(0.62)
  return s
}

// «бесконечная» сетка: мелкие линии 10 мм, крупные 50 мм, плавно гаснет с расстоянием
function makeGrid() {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uCenter: { value: new THREE.Vector3() }, uFade: { value: 600 } },
    vertexShader: `varying vec3 vPos; void main(){ vec4 w = modelMatrix * vec4(position,1.); vPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      varying vec3 vPos; uniform vec3 uCenter; uniform float uFade;
      float line(float size, float w){
        vec2 c = vPos.xy / size; vec2 g = abs(fract(c - .5) - .5) / fwidth(c);
        return 1. - min(min(g.x, g.y) / w, 1.);
      }
      void main(){
        float d = distance(vPos.xy, uCenter.xy);
        float fade = 1. - smoothstep(uFade * .25, uFade, d);
        float minor = line(10., 1.) * .15, major = line(50., 1.5) * .45;
        float a = max(minor, major) * fade;
        if (a < .01) discard;
        gl_FragColor = vec4(vec3(.17, .45, .75), a);
      }`,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)
  mesh.renderOrder = -1
  return mesh
}

export function Viewport({ model, plate, onFitReady }: { model: Manifold | null; plate: BuildPlate | null; onFitReady?: (fit: () => void) => void }) {
  const host = useRef<HTMLDivElement>(null)
  const api = useRef<Api | null>(null)

  useEffect(() => {
    const el = host.current!
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.autoClear = false
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x12161d)
    const camera = new THREE.PerspectiveCamera(35, 1, 0.5, 20000)
    camera.up.set(0, 0, 1)
    camera.position.set(160, -220, 160)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.maxPolarAngle = Math.PI * 0.499 // не уходим под стол
    controls.minDistance = 30
    controls.maxDistance = 1500

    scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.4))
    const sun = new THREE.DirectionalLight(0xffffff, 1.6)
    sun.position.set(120, -180, 300)
    scene.add(sun)

    const grid = makeGrid()
    grid.scale.setScalar(6000)
    grid.position.z = -0.02
    scene.add(grid)

    // стол: полупрозрачная плита + контур
    const plateGroup = new THREE.Group()
    scene.add(plateGroup)

    const modelGroup = new THREE.Group()
    scene.add(modelGroup)
    let radius = 60

    // гизмо осей
    const gScene = new THREE.Scene()
    const gCam = new THREE.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0.1, 10)
    gCam.up.set(0, 0, 1)
    const hits: THREE.Sprite[] = []
    for (const a of AXES) {
      const dir = new THREE.Vector3(...a.dir)
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), dir.clone().multiplyScalar(0.95)]),
        new THREE.LineBasicMaterial({ color: a.color, depthTest: false }),
      )
      gScene.add(line)
      const pos = labelSprite(a.label, a.color, true); pos.position.copy(dir); pos.userData.dir = dir.clone(); gScene.add(pos); hits.push(pos)
      const neg = labelSprite('', a.color, false); neg.position.copy(dir).negate(); neg.scale.setScalar(0.4); neg.userData.dir = dir.clone().negate(); gScene.add(neg); hits.push(neg)
    }

    const fit = () => {
      const dist = (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.15
      const dir = camera.position.clone().sub(controls.target).normalize()
      controls.target.set(0, 0, 0)
      camera.position.copy(dir.multiplyScalar(dist))
      controls.minDistance = Math.max(radius * 0.35, 15)
    }
    const view = (dir: THREE.Vector3) => {
      const dist = camera.position.distanceTo(controls.target)
      const d = dir.clone()
      if (Math.abs(d.z) === 1) d.add(new THREE.Vector3(0, -1e-3, 0)) // чтобы up-вектор не вырождался
      camera.position.copy(controls.target).add(d.normalize().multiplyScalar(dist))
    }

    let fitted = false
    api.current = {
      fit,
      setPlate(p) {
        plateGroup.children.forEach((c) => { const m = c as THREE.Mesh; m.geometry.dispose() })
        plateGroup.clear()
        if (!p) return
        const fill = new THREE.Mesh(new THREE.PlaneGeometry(p.x, p.y), new THREE.MeshBasicMaterial({ color: 0x1d2735, transparent: true, opacity: 0.85, depthWrite: false }))
        fill.position.z = -0.05
        const box = new THREE.EdgesGeometry(new THREE.PlaneGeometry(p.x, p.y))
        const outline = new THREE.LineSegments(box, new THREE.LineBasicMaterial({ color: 0x5aa9ff }))
        outline.position.z = -0.04
        plateGroup.add(fill, outline)
      },
      setModel(m) {
        modelGroup.children.forEach((c) => {
          const o = c as THREE.Mesh
          o.geometry.dispose()
        })
        modelGroup.clear()
        if (!m) return
        const mm = m.getMesh()
        const pos = new Float32Array((mm.vertProperties.length / mm.numProp) * 3)
        for (let i = 0; i < pos.length / 3; i++)
          for (let k = 0; k < 3; k++) pos[i * 3 + k] = mm.vertProperties[i * mm.numProp + k]
        const indexed = new THREE.BufferGeometry()
        indexed.setAttribute('position', new THREE.BufferAttribute(pos, 3))
        indexed.setIndex(new THREE.BufferAttribute(mm.triVerts, 1))
        // плоское затенение — чёткие грани
        const g = indexed.toNonIndexed()
        g.computeVertexNormals()
        const body = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
          color: 0x3a9ae0, roughness: 0.6, metalness: 0.05, flatShading: true,
          polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
        }))
        // контуры: только резкие рёбра (угол > 25°)
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(indexed, 25), new THREE.LineBasicMaterial({ color: 0x082338 }))
        modelGroup.add(body, edges)
        indexed.computeBoundingSphere()
        radius = indexed.boundingSphere!.radius
        if (!fitted) { fitted = true; fit() }
      },
    }
    onFitReady?.(fit)

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    // клик по гизмо — выровнять вид по оси
    const ray = new THREE.Raycaster()
    const onClick = (e: MouseEvent) => {
      const r = renderer.domElement.getBoundingClientRect()
      const gx = e.clientX - (r.right - GIZMO_SIZE), gy = e.clientY - (r.bottom - GIZMO_SIZE)
      if (gx < 0 || gy < 0 || gx > GIZMO_SIZE || gy > GIZMO_SIZE) return
      ray.setFromCamera(new THREE.Vector2((gx / GIZMO_SIZE) * 2 - 1, 1 - (gy / GIZMO_SIZE) * 2), gCam)
      const hit = ray.intersectObjects(hits)[0]
      if (hit) view(hit.object.userData.dir)
    }
    renderer.domElement.addEventListener('click', onClick)

    const tmp = new THREE.Vector3()
    renderer.setAnimationLoop(() => {
      controls.update()
      grid.position.x = Math.round(controls.target.x / 50) * 50
      grid.position.y = Math.round(controls.target.y / 50) * 50
      ;(grid.material as THREE.ShaderMaterial).uniforms.uCenter.value.set(0, 0, 0)
      ;(grid.material as THREE.ShaderMaterial).uniforms.uFade.value = Math.max(600, camera.position.distanceTo(controls.target) * 3)
      const w = el.clientWidth, h = el.clientHeight
      renderer.setViewport(0, 0, w, h); renderer.setScissorTest(false)
      renderer.clear(); renderer.render(scene, camera)
      // гизмо
      tmp.copy(camera.position).sub(controls.target).normalize().multiplyScalar(4)
      gCam.position.copy(tmp); gCam.lookAt(0, 0, 0)
      renderer.setScissorTest(true)
      renderer.setViewport(w - GIZMO_SIZE, 0, GIZMO_SIZE, GIZMO_SIZE)
      renderer.setScissor(w - GIZMO_SIZE, 0, GIZMO_SIZE, GIZMO_SIZE)
      renderer.clearDepth(); renderer.render(gScene, gCam)
    })
    return () => {
      ro.disconnect(); renderer.setAnimationLoop(null)
      renderer.domElement.removeEventListener('click', onClick)
      controls.dispose(); renderer.dispose(); el.removeChild(renderer.domElement)
    }
  }, [])

  useEffect(() => { api.current?.setModel(model) }, [model])
  useEffect(() => { api.current?.setPlate(plate) }, [plate])
  return <div ref={host} style={{ width: '100%', height: '100%' }} />
}
