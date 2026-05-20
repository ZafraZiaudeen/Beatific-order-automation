import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'

export default function ThreeBackground() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    const W = mount.clientWidth
    const H = mount.clientHeight

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 200)
    camera.position.set(0, 0, 28)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    /* ── Floating book-page quads ── */
    const pageGroup = new THREE.Group()
    scene.add(pageGroup)

    const palette = [
      '#ffffff', '#d1fae5', '#a7f3d0', '#6ee7b7',
      '#fb923c', '#f97316', '#facc15', '#fff7ed',
    ]
    const pages = []

    for (let i = 0; i < 20; i++) {
      const w = THREE.MathUtils.randFloat(2.2, 5.8)
      const h = w * THREE.MathUtils.randFloat(1.25, 1.65)
      const geo = new THREE.PlaneGeometry(w, h)
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(palette[Math.floor(Math.random() * palette.length)]),
        transparent: true,
        opacity: THREE.MathUtils.randFloat(0.04, 0.13),
        side: THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(
        THREE.MathUtils.randFloatSpread(44),
        THREE.MathUtils.randFloatSpread(32),
        THREE.MathUtils.randFloatSpread(22),
      )
      mesh.rotation.set(
        THREE.MathUtils.randFloatSpread(Math.PI),
        THREE.MathUtils.randFloatSpread(Math.PI),
        THREE.MathUtils.randFloatSpread(Math.PI),
      )
      pageGroup.add(mesh)
      pages.push({
        mesh,
        rotSpeed: new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(0.0016),
          THREE.MathUtils.randFloatSpread(0.0022),
          THREE.MathUtils.randFloatSpread(0.0012),
        ),
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: THREE.MathUtils.randFloat(0.18, 0.42),
        floatAmp:   THREE.MathUtils.randFloat(0.6, 1.6),
        baseY: mesh.position.y,
      })
    }

    /* ── Particles ── */
    const pCount = 280
    const pPos = new Float32Array(pCount * 3)
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3]     = THREE.MathUtils.randFloatSpread(80)
      pPos[i * 3 + 1] = THREE.MathUtils.randFloatSpread(60)
      pPos[i * 3 + 2] = THREE.MathUtils.randFloatSpread(40)
    }
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    const pMat = new THREE.PointsMaterial({ color: 0x6ee7b7, size: 0.1, transparent: true, opacity: 0.3 })
    const particles = new THREE.Points(pGeo, pMat)
    scene.add(particles)

    /* ── Soft ring ── */
    const rGeo = new THREE.TorusGeometry(14, 0.05, 8, 120)
    const rMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.1 })
    const ring = new THREE.Mesh(rGeo, rMat)
    ring.rotation.x = Math.PI / 2.6
    scene.add(ring)

    /* ── GSAP entrance ── */
    pages.forEach(({ mesh }, i) =>
      gsap.from(mesh.material, { opacity: 0, duration: 2, delay: i * 0.05, ease: 'power2.out' })
    )

    /* ── Mouse parallax ── */
    const mouse = { x: 0, y: 0 }
    const onMouseMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2
      mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMouseMove)

    /* ── Render loop ── */
    let raf
    const clock = new THREE.Clock()

    const animate = () => {
      raf = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()

      pages.forEach(p => {
        p.mesh.rotation.x += p.rotSpeed.x
        p.mesh.rotation.y += p.rotSpeed.y
        p.mesh.rotation.z += p.rotSpeed.z
        p.mesh.position.y = p.baseY + Math.sin(t * p.floatSpeed + p.floatOffset) * p.floatAmp
      })

      particles.rotation.y = t * 0.012
      ring.rotation.z = t * 0.04

      pageGroup.rotation.y += (mouse.x * 0.1 - pageGroup.rotation.y) * 0.032
      pageGroup.rotation.x += (mouse.y * 0.06 - pageGroup.rotation.x) * 0.032

      renderer.render(scene, camera)
    }
    animate()

    /* ── Resize ── */
    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      pageGroup.traverse(child => {
        if (child.isMesh) {
          child.geometry.dispose()
          child.material.dispose()
        }
      })
      pGeo.dispose(); pMat.dispose()
      rGeo.dispose(); rMat.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="absolute inset-0 w-full h-full" />
}
