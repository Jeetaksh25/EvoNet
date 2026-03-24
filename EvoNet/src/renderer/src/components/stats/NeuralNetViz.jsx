import { useEffect, useRef } from 'react'
import { Box } from '@chakra-ui/react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { usePredictionStore } from '../../store/usePredictionStore'

const NeuralNetViz = () => {
  const mountRef = useRef(null)
  const result = usePredictionStore((s) => s.result)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const W = mount.clientWidth || 300
    const H = mount.clientHeight || 210

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(window.devicePixelRatio)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200)
    camera.position.set(10, 6, 18)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.enablePan = false

    const layers = [
      { real: 256, display: 40, x: -6, color: 0x00ffe0 },
      { real: 128, display: 30, x: 0, color: 0x0080ff },
      { real: 10, display: 10, x: 6, color: 0xff6b6b }
    ]

    const nodesByLayer = []

    layers.forEach((layer) => {
      const nodes = []

      const spacing = Math.min(0.6, 6 / layer.display)
      const totalH = (layer.display - 1) * spacing

      for (let i = 0; i < layer.display; i++) {
        const y = totalH / 2 - i * spacing

        const z = ((i % 5) - 2) * 1.5 + Math.random() * 0.4

        const geo = new THREE.SphereGeometry(0.16, 16, 16)

        const mat = new THREE.MeshStandardMaterial({
          color: layer.color,
          emissive: layer.color,
          emissiveIntensity: 0.25
        })

        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.set(layer.x, y, z)

        scene.add(mesh)
        nodes.push(mesh)
      }

      nodesByLayer.push(nodes)
    })

    for (let l = 0; l < nodesByLayer.length - 1; l++) {
      nodesByLayer[l].forEach((from) => {
        nodesByLayer[l + 1].forEach((to) => {
          if (Math.random() > 0.3) return
          const mid = new THREE.Vector3().addVectors(from.position, to.position).multiplyScalar(0.5)

          mid.z += (Math.random() - 0.5) * 2

          const curve = new THREE.QuadraticBezierCurve3(from.position, mid, to.position)

          const points = curve.getPoints(20)

          const geo = new THREE.BufferGeometry().setFromPoints(points)
          const mat = new THREE.LineBasicMaterial({
            color: l === 0 ? 0x00ffe0 : 0x0080ff,
            transparent: true,
            opacity: 0.06
          })

          scene.add(new THREE.Line(geo, mat))
        })
      })
    }

    const prediction = result?.prediction
    if (prediction != null && nodesByLayer[2]?.[prediction]) {
      const node = nodesByLayer[2][prediction]

      node.material.emissiveIntensity = 3.5
      node.material.color.setHex(0xffd700)
      node.material.emissive.setHex(0xffd700)
      node.scale.setScalar(1.6)

      const ringGeo = new THREE.TorusGeometry(0.42, 0.04, 8, 32)
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.6
      })

      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.position.copy(node.position)
      scene.add(ring)
    }

    scene.add(new THREE.AmbientLight(0xffffff, 0.5))

    const key = new THREE.PointLight(0x00ffe0, 3, 40)
    key.position.set(-3, 6, 10)
    scene.add(key)

    const fill = new THREE.PointLight(0x0080ff, 1.5, 40)
    fill.position.set(6, -4, 8)
    scene.add(fill)

    let frame
    let t = 0

    const animate = () => {
      frame = requestAnimationFrame(animate)

      t += 0.01

      scene.rotation.y += 0.002
      scene.position.y = Math.sin(t) * 0.08

      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(frame)
      controls.dispose()
      renderer.dispose()

      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [result])

  return <Box ref={mountRef} w="100%" h="100%" />
}

export default NeuralNetViz
