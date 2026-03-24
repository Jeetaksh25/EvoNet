import { useEffect, useRef } from 'react'
import { Box } from '@chakra-ui/react'
import * as THREE from 'three'
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
    renderer.shadowMap.enabled = true
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200)
    camera.position.set(4, 3, 16)
    camera.lookAt(0, 0, 0)

    const layers = [
      { count: 8, x: -5.5, color: 0x00ffe0, label: 'Input\n256' },
      { count: 12, x: 0, color: 0x0080ff, label: 'Hidden\n128' },
      { count: 10, x: 5.5, color: 0xff6b6b, label: 'Output\n10' }
    ]

    const nodesByLayer = []

    layers.forEach((layer) => {
      const nodes = []
      const spacing = Math.min(0.75, 7 / layer.count)
      const totalH = (layer.count - 1) * spacing

      const zOffset = layer.x * 0.18

      for (let i = 0; i < layer.count; i++) {
        const y = totalH / 2 - i * spacing
        const geo = new THREE.SphereGeometry(0.2, 20, 20)
        const mat = new THREE.MeshStandardMaterial({
          color: layer.color,
          emissive: layer.color,
          emissiveIntensity: 0.35,
          roughness: 0.25,
          metalness: 0.7
        })
        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.set(layer.x, y, zOffset)
        mesh.castShadow = true
        scene.add(mesh)
        nodes.push(mesh)
      }
      nodesByLayer.push(nodes)
    })

    for (let l = 0; l < nodesByLayer.length - 1; l++) {
      nodesByLayer[l].forEach((from) => {
        nodesByLayer[l + 1].forEach((to) => {
          const lineMat = new THREE.LineBasicMaterial({
            color: l === 0 ? 0x00ffe0 : 0x0080ff,
            opacity: 0.06,
            transparent: true
          })
          const geo = new THREE.BufferGeometry().setFromPoints([from.position, to.position])
          scene.add(new THREE.Line(geo, lineMat))
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
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.5 })
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
      scene.rotation.y += 0.004
      scene.position.y = Math.sin(t) * 0.08
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frame)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [result])

  return <Box ref={mountRef} w="100%" h="100%" />
}

export default NeuralNetViz