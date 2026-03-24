import { useState, useEffect, useRef } from 'react'
import { Box, Text, Button, Flex, Grid, GridItem, Spinner } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import {
  HeatMapComponent,
  Legend as HeatLegend,
  Tooltip as HeatTooltip,
  Adaptor
} from '@syncfusion/ej2-react-heatmap'
import * as THREE from 'three'

import {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject,
  SplineSeries,
  SplineAreaSeries,
  AreaSeries,
  ColumnSeries,
  Category,
  Tooltip,
  Crosshair,
  Legend
} from '@syncfusion/ej2-react-charts'
import CustomButton from '../components/CustomButton'
import { IoIosArrowRoundBack } from 'react-icons/io'
import HeadingText from '../components/HeadingText'

const MotionBox = motion.create(Box)
const MotionGrid = motion.create(Grid)

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.45, delay: i * 0.08 } })
}

// ── Three.js Neural Network ───────────────────────────────────────────────────
function NeuralNetViz({ result }) {
  const mountRef = useRef(null)

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
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100)
    camera.position.set(0, 0, 14)

    const layers = [
      { count: 8, x: -5, color: 0x00ffe0 },
      { count: 12, x: 0, color: 0x0080ff },
      { count: 10, x: 5, color: 0xff6b6b }
    ]

    const nodesByLayer = []

    layers.forEach((layer) => {
      const nodes = []
      const spacing = Math.min(0.8, 8 / layer.count)
      const totalH = (layer.count - 1) * spacing
      for (let i = 0; i < layer.count; i++) {
        const y = totalH / 2 - i * spacing
        const geo = new THREE.SphereGeometry(0.18, 16, 16)
        const mat = new THREE.MeshStandardMaterial({
          color: layer.color,
          emissive: layer.color,
          emissiveIntensity: 0.4,
          roughness: 0.3,
          metalness: 0.6
        })
        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.set(layer.x, y, 0)
        scene.add(mesh)
        nodes.push(mesh)
      }
      nodesByLayer.push(nodes)
    })

    // Connections
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00ffe0,
      opacity: 0.07,
      transparent: true
    })
    for (let l = 0; l < nodesByLayer.length - 1; l++) {
      nodesByLayer[l].forEach((from) => {
        nodesByLayer[l + 1].forEach((to) => {
          const geo = new THREE.BufferGeometry().setFromPoints([from.position, to.position])
          scene.add(new THREE.Line(geo, lineMat))
        })
      })
    }

    // Highlight predicted node
    if (result?.prediction != null && nodesByLayer[2]?.[result.prediction]) {
      const node = nodesByLayer[2][result.prediction]
      node.material.emissiveIntensity = 2.8
      node.material.color.setHex(0xffd700)
      node.material.emissive.setHex(0xffd700)
    }

    scene.add(new THREE.AmbientLight(0xffffff, 0.4))
    const point = new THREE.PointLight(0x00ffe0, 2, 30)
    point.position.set(0, 5, 8)
    scene.add(point)

    let frame
    const animate = () => {
      frame = requestAnimationFrame(animate)
      scene.rotation.y += 0.003
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

// ── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ children, custom, ...props }) {
  return (
    <MotionBox
      bg="#0d1117"
      border="1px solid #ffffff0f"
      borderRadius="8px"
      p={5}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      custom={custom}
      {...props}
    >
      {children}
    </MotionBox>
  )
}

function CardLabel({ children }) {
  return (
    <Text fontSize="10px" letterSpacing="0.2em" color="#00ffe088" textTransform="uppercase" mb={3}>
      {children}
    </Text>
  )
}

// ── Stats Page ────────────────────────────────────────────────────────────────
export function StatsPage({ result, onBack }) {
  const [fitnessHistory, setFitnessHistory] = useState([])
  const [meta, setMeta] = useState(null)

  useEffect(() => {
    window.api.getFitnessHistory().then((vals) => {
      setFitnessHistory(vals.map((v, i) => ({ x: i, y: parseFloat((v * 100).toFixed(2)) })))
    })
    window.api.getModelMeta().then(setMeta)
  }, [])

  const confidenceData = (result?.all_confidences ?? Array(10).fill(0)).map((v, i) => ({
    x: String(i),
    y: parseFloat((v * 100).toFixed(2))
  }))

  const heatmapData = []
  if (result?.pixels) {
    for (let row = 0; row < 16; row++) {
      const rowData = []
      for (let col = 0; col < 16; col++) {
        rowData.push(parseFloat((result.pixels[row * 16 + col] * 100).toFixed(1)))
      }
      heatmapData.push(rowData)
    }
  }

  const axisLabels16 = Array.from({ length: 16 }, (_, i) => String(i))

  const axisStyle = {
    labelStyle: { color: '#ffffff44', fontFamily: 'IBM Plex Mono', size: '10px' },
    lineStyle: { color: '#ffffff12' },
    majorGridLines: { color: '#ffffff08' },
    majorTickLines: { width: 0 }
  }

  return (
    <Box w="100%" minH="100vh" display="flex" justifyContent="center" alignItems="center">
      <Box
        w={'90%'}
        h={'auto'}
        mx="auto"
        position="relative"
        zIndex={1}
        p={10}
        bg={'rgba(0, 0, 0, 0.5)'}
      >
        <MotionBox variants={fadeUp} initial="hidden" animate="show" custom={0} mb={8}>
          <Flex align="center" justify="space-between">
            <Box>
              <HeadingText text={'Model Analytics'} />
            </Box>
            <CustomButton text={'Back'} onClick={onBack} iconLeft={<IoIosArrowRoundBack />} />
          </Flex>
        </MotionBox>

        {/* Row 1: Meta cards */}
        {meta && (
          <MotionGrid
            templateColumns="repeat(4, 1fr)"
            gap={4}
            mb={6}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
          >
            {[
              { label: 'Architecture', val: meta.architecture },
              { label: 'Total Params', val: meta.totalParams.toLocaleString() },
              { label: 'Activation', val: meta.activation },
              { label: 'Val Accuracy', val: `${(meta.valAccuracy * 100).toFixed(2)}%` }
            ].map(({ label, val }) => (
              <GridItem key={label}>
                <Box bg="#0d1117" border="1px solid #ffffff0f" borderRadius="8px" p={4}>
                  <Text
                    fontSize="9px"
                    letterSpacing="0.2em"
                    color="#ffffff44"
                    textTransform="uppercase"
                    mb={1}
                  >
                    {label}
                  </Text>
                  <Text fontSize="16px" fontWeight="700" color="#00ffe0">
                    {val}
                  </Text>
                </Box>
              </GridItem>
            ))}
          </MotionGrid>
        )}

        {/* Row 2: Fitness history + 3D net */}
        <Grid templateColumns="1.6fr 1fr" gap={6} mb={6}>
          <Card custom={2} h="280px">
            <CardLabel>Fitness History — 400 Generations</CardLabel>
            {fitnessHistory.length > 0 ? (
              <ChartComponent
                height="200px"
                background="transparent"
                primaryXAxis={{ ...axisStyle, minimum: 0, maximum: 400 }}
                primaryYAxis={{ ...axisStyle, minimum: 60, maximum: 80, labelFormat: '{value}%' }}
                tooltip={{
                  enable: true,
                  fill: '#0d1117',
                  border: { color: '#00ffe044' },
                  textStyle: { fontFamily: 'IBM Plex Mono', color: '#00ffe0', size: '10px' }
                }}
                crosshair={{ enable: true, lineType: 'Vertical', line: { color: '#00ffe022' } }}
                chartArea={{ border: { width: 0 } }}
              >
                <Inject
                  services={[SplineSeries, SplineAreaSeries, AreaSeries, Tooltip, Crosshair]}
                />
                <SeriesCollectionDirective>
                  <SeriesDirective
                    dataSource={fitnessHistory}
                    xName="x"
                    yName="y"
                    type="SplineArea"
                    fill="#00ffe010"
                    border={{ color: '#00ffe0', width: 2 }}
                    opacity={0.6}
                  />
                </SeriesCollectionDirective>
              </ChartComponent>
            ) : (
              <Flex h="200px" align="center" justify="center">
                <Spinner color="#00ffe0" sx={{ '--spinner-track-color': '#ffffff0a' }} />
              </Flex>
            )}
          </Card>

          <Card custom={3} h="280px">
            <CardLabel>Neural Network — 3D</CardLabel>
            <Box h="210px">
              <NeuralNetViz result={result} />
            </Box>
          </Card>
        </Grid>

        {/* Row 3: Confidence + Heatmap */}
        <Grid templateColumns="1fr 1fr" gap={6} mb={6}>
          <Card custom={4} h="280px">
            <Flex align="center" justify="space-between" mb={3}>
              <CardLabel>Confidence per Digit</CardLabel>
              {result && (
                <Box
                  px={2}
                  py="2px"
                  bg="#00ffe015"
                  color="#00ffe0"
                  border="1px solid #00ffe033"
                  borderRadius="full"
                  fontSize="10px"
                  letterSpacing="0.1em"
                >
                  Predicted: {result.prediction}
                </Box>
              )}
            </Flex>
            {/* FIX 3: Inject now includes ColumnSeries + Category (was missing both) */}
            <ChartComponent
              height="200px"
              background="transparent"
              primaryXAxis={{ ...axisStyle, valueType: 'Category' }}
              primaryYAxis={{ ...axisStyle, minimum: 0, maximum: 100, labelFormat: '{value}%' }}
              tooltip={{
                enable: true,
                fill: '#0d1117',
                border: { color: '#0080ff44' },
                textStyle: { fontFamily: 'IBM Plex Mono', color: '#0080ff', size: '10px' }
              }}
              chartArea={{ border: { width: 0 } }}
            >
              <Inject services={[ColumnSeries, Category, Tooltip, Crosshair]} />
              <SeriesCollectionDirective>
                <SeriesDirective
                  dataSource={confidenceData}
                  xName="x"
                  yName="y"
                  type="Column"
                  fill="#0080ff"
                  opacity={0.8}
                  cornerRadius={{ topLeft: 3, topRight: 3 }}
                />
              </SeriesCollectionDirective>
            </ChartComponent>
          </Card>

          <Card custom={5} h="280px">
            <CardLabel>Processed Input — 16×16 Heatmap</CardLabel>
            {heatmapData.length > 0 ? (
              <HeatMapComponent
                height="200px"
                xAxis={{
                  labels: axisLabels16,
                  labelStyle: { color: 'transparent' },
                  border: { width: 0 }
                }}
                yAxis={{
                  labels: axisLabels16,
                  labelStyle: { color: 'transparent' },
                  border: { width: 0 }
                }}
                dataSource={heatmapData}
                paletteSettings={{
                  palette: [
                    { color: '#080c10', value: 0 },
                    { color: '#003366', value: 30 },
                    { color: '#0080ff', value: 60 },
                    { color: '#00ffe0', value: 100 }
                  ],
                  type: 'Gradient'
                }}
                cellSettings={{ border: { width: 0 }, showLabel: false }}
                legendSettings={{ visible: false }}
                tooltipSettings={{
                  enable: true,
                  fill: '#0d1117',
                  textStyle: { fontFamily: 'IBM Plex Mono', size: '10px', color: '#00ffe0' }
                }}
              >
                <Inject services={[HeatLegend, HeatTooltip, Adaptor]} />
              </HeatMapComponent>
            ) : (
              <Flex h="200px" align="center" justify="center" opacity={0.3}>
                <Text fontSize="11px" letterSpacing="0.2em" color="#00ffe0">
                  NO PREDICTION YET
                </Text>
              </Flex>
            )}
          </Card>
        </Grid>

        {/* Row 4: GA params */}
        <Card custom={6}>
          <CardLabel>Genetic Algorithm Parameters</CardLabel>
          <Grid templateColumns="repeat(6, 1fr)" gap={4}>
            {[
              ['Population', '300'],
              ['Generations', '400'],
              ['Mutation Rate', '5% → 1%'],
              ['Elite Size', '6'],
              ['Tournament', '7'],
              ['Crossover', 'Uniform + Blend']
            ].map(([label, val]) => (
              <Box key={label} textAlign="center">
                <Text
                  fontSize="9px"
                  letterSpacing="0.15em"
                  color="#ffffff33"
                  textTransform="uppercase"
                  mb={1}
                >
                  {label}
                </Text>
                <Text fontSize="13px" fontWeight="600" color="#0080ff">
                  {val}
                </Text>
              </Box>
            ))}
          </Grid>
        </Card>
      </Box>
    </Box>
  )
}
