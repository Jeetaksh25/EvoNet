import { useState, useRef, useCallback } from 'react'
import { Box, Text, Button, Flex, Grid, GridItem, Spinner } from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast, Toaster } from 'react-hot-toast'
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw'
import { StatsPage } from './components/StatsPage'
import '@excalidraw/excalidraw/index.css'

const MotionBox = motion(Box)
const MotionText = motion(Text)
const MotionFlex = motion(Flex)

const STEPS = [
  'Analyzing image...',
  'Centering by mass...',
  'Processing pixels...',
  'Running EvoNet...',
  'Predicting...'
]

const META_STRIP = [
  ['ARCH', '256 → 128 → 10'],
  ['PARAMS', '34,058'],
  ['OPTIMIZER', 'Genetic Algorithm'],
  ['VAL ACC', '74.92%']
]

export default function App() {
  const [view, setView] = useState('main')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sceneData, setSceneData] = useState({ elements: [], appState: {}, files: {} })
  const [previewUrl, setPreviewUrl] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [strokeWidth, setStrokeWidth] = useState(20)

  // Two separate refs — one for preview (view mode), one for editing
  const previewRef = useRef(null)
  const editorRef = useRef(null)
  const stepTimer = useRef(null)

  const handleOpenModal = () => setIsModalOpen(true)

  const handleCloseModal = useCallback(async () => {
    try {
      const elements = editorRef.current?.getSceneElements() ?? []
      const appState = editorRef.current?.getAppState() ?? {}
      const files = editorRef.current?.getFiles() ?? {}

      const newScene = { elements, appState, files }
      setSceneData(newScene)

      if (elements.length > 0) {
        const blob = await exportToBlob({
          elements,
          appState: { ...appState, exportBackground: true, theme: 'dark' },
          files,
          mimeType: 'image/png'
        })
        const reader = new FileReader()
        reader.onload = () => {
          setPreviewUrl(reader.result)
          setResult(null)
        }
        reader.readAsDataURL(blob)
      }
    } catch (err) {
      console.error('Export error:', err)
    }
    setIsModalOpen(false)
  }, [])

  const handleClearCanvas = useCallback(() => {
    editorRef.current?.updateScene({ elements: [] })
  }, [])

  const handlePredict = useCallback(async () => {
    if (!previewUrl || loading) return
    setLoading(true)
    setResult(null)
    setStepIndex(0)

    let i = 0
    stepTimer.current = setInterval(() => {
      i++
      if (i < STEPS.length) setStepIndex(i)
      else clearInterval(stepTimer.current)
    }, 420)

    try {
      const res = await window.api.predictDigit(previewUrl)
      clearInterval(stepTimer.current)
      setResult(res)
    } catch (err) {
      clearInterval(stepTimer.current)
      toast.error('Prediction failed: ' + String(err))
    }
    setLoading(false)
  }, [previewUrl, loading])

  if (view === 'stats') {
    return <StatsPage result={result} onBack={() => setView('main')} />
  }

  return (
    <Box
      minH="100vh" bg="#080c10" color="#e2e8f0"
      fontFamily="'IBM Plex Mono', 'Courier New', monospace"
      overflow="hidden" position="relative"
    >
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0d1117', color: '#ff6b6b',
            border: '1px solid #ff6b6b33',
            fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px'
          }
        }}
      />

      {/* Grid background */}
      <Box
        position="absolute" inset={0} zIndex={0} opacity={0.04}
        backgroundImage="linear-gradient(#00ffe0 1px, transparent 1px), linear-gradient(90deg, #00ffe0 1px, transparent 1px)"
        backgroundSize="40px 40px" pointerEvents="none"
      />

      <Flex
        direction="column" align="center" justify="center"
        minH="100vh" gap={6} px={8} position="relative" zIndex={1}
      >
        {/* Header */}
        <MotionBox
          textAlign="center"
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Text fontSize="11px" letterSpacing="0.3em" color="#00ffe0"
            textTransform="uppercase" mb={1} opacity={0.8}>
            Genetic Algorithm · Neural Classifier
          </Text>
          <Text fontSize="42px" fontWeight="800" letterSpacing="-0.02em"
            bgGradient="linear(135deg, #00ffe0, #0080ff)" bgClip="text" lineHeight={1}>
            EvoNet
          </Text>
        </MotionBox>

        {/* Main grid */}
        <MotionBox
          w="100%" maxW="820px"
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Grid templateColumns="1fr 1fr" gap={6}>

            {/* Left: Canvas preview */}
            <GridItem>
              <Text fontSize="10px" letterSpacing="0.25em" color="#00ffe088"
                textTransform="uppercase" mb={2}>
                Input Canvas
              </Text>

              {/* Preview box */}
              <Box
                w="100%" aspectRatio="1"
                border="1px solid"
                borderColor={previewUrl ? '#00ffe044' : '#ffffff18'}
                borderRadius="8px" overflow="hidden"
                cursor="pointer" position="relative" bg="#0d1117"
                onClick={handleOpenModal}
                transition="border-color 0.2s, box-shadow 0.2s"
                _hover={{ borderColor: '#00ffe066', boxShadow: '0 0 18px #00ffe033' }}
              >
                {sceneData.elements.length > 0 ? (
                  <>
                    {/* Live Excalidraw preview in view mode */}
                    <Box w="100%" h="100%" pointerEvents="none">
                      <Excalidraw
                        ref={previewRef}
                        initialData={sceneData}
                        viewModeEnabled={true}
                        theme="dark"
                        UIOptions={{ canvasActions: {} }}
                      />
                    </Box>
                    <Box
                      position="absolute" inset={0}
                      bg="linear-gradient(transparent 65%, #080c10cc)"
                      pointerEvents="none"
                    />
                    <Text
                      position="absolute" bottom={2} left={0} right={0}
                      textAlign="center" fontSize="10px" color="#00ffe077" letterSpacing="0.2em"
                    >
                      CLICK TO EDIT
                    </Text>
                  </>
                ) : (
                  <Flex direction="column" align="center" justify="center" h="100%" gap={3} opacity={0.4}>
                    <Text fontSize="32px">✏️</Text>
                    <Text fontSize="11px" letterSpacing="0.2em" color="#00ffe0">CLICK TO DRAW</Text>
                  </Flex>
                )}
              </Box>

              {/* Stroke slider */}
              <Flex align="center" gap={3} mt={3}>
                <Text fontSize="10px" color="#ffffff55" letterSpacing="0.15em" whiteSpace="nowrap">
                  STROKE
                </Text>
                <Box
                  as="input" type="range" min={5} max={40} value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  flex={1}
                  sx={{ accentColor: '#00ffe0', cursor: 'pointer', height: '4px' }}
                />
                <Text fontSize="10px" color="#00ffe0" w="24px" textAlign="right">
                  {strokeWidth}
                </Text>
              </Flex>
            </GridItem>

            {/* Right: Result */}
            <GridItem>
              <Text fontSize="10px" letterSpacing="0.25em" color="#00ffe088"
                textTransform="uppercase" mb={2}>
                Prediction
              </Text>

              <Box
                w="100%" aspectRatio="1"
                border="1px solid #ffffff18" borderRadius="8px"
                bg="#0d1117" display="flex" flexDirection="column"
                alignItems="center" justifyContent="center"
                gap={4} position="relative" overflow="hidden"
              >
                <AnimatePresence mode="wait">
                  {loading && (
                    <MotionFlex
                      key="loading"
                      direction="column" align="center" gap={4}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      position="absolute" inset={0} justify="center"
                    >
                      <Box
                        position="absolute" left={0} right={0} h="2px"
                        bg="linear-gradient(90deg, transparent, #00ffe0, transparent)"
                        sx={{
                          animation: 'scanline 1.2s linear infinite',
                          '@keyframes scanline': {
                            '0%': { transform: 'translateY(-200px)' },
                            '100%': { transform: 'translateY(400px)' }
                          }
                        }}
                        opacity={0.5}
                      />
                      <Spinner size="lg" color="#00ffe0"
                        sx={{ '--spinner-track-color': '#ffffff0a' }} />
                      <AnimatePresence mode="wait">
                        <MotionText
                          key={stepIndex}
                          fontSize="11px" color="#00ffe0" letterSpacing="0.2em"
                          textAlign="center" px={4}
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}
                        >
                          {STEPS[stepIndex]}
                        </MotionText>
                      </AnimatePresence>
                    </MotionFlex>
                  )}

                  {!loading && result && (
                    <MotionFlex
                      key="result"
                      direction="column" align="center" gap={3} px={4} w="100%"
                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                    >
                      <Text
                        fontSize="96px" fontWeight="900" lineHeight={1}
                        bgGradient="linear(135deg, #00ffe0, #0080ff)" bgClip="text"
                      >
                        {result.prediction}
                      </Text>
                      <Box
                        px={3} py={1} bg="#00ffe015" color="#00ffe0"
                        border="1px solid #00ffe033" borderRadius="full"
                        fontSize="11px" letterSpacing="0.15em"
                      >
                        {(result.confidence * 100).toFixed(2)}% CONFIDENCE
                      </Box>
                      <Grid templateColumns="repeat(5, 1fr)" gap={1} w="100%">
                        {(result.all_confidences ?? []).map((c, i) => (
                          <Flex key={i} direction="column" align="center" gap="2px">
                            <Box
                              w="100%" bg="#ffffff0a" borderRadius="2px"
                              overflow="hidden" h="28px" position="relative"
                            >
                              <MotionBox
                                position="absolute" bottom={0} left={0} right={0}
                                bg={i === result.prediction ? '#00ffe0' : '#0080ff44'}
                                borderRadius="2px"
                                initial={{ height: 0 }}
                                animate={{ height: `${c * 100}%` }}
                                transition={{ duration: 0.5, delay: i * 0.03 }}
                              />
                            </Box>
                            <Text fontSize="9px"
                              color={i === result.prediction ? '#00ffe0' : '#ffffff33'}>
                              {i}
                            </Text>
                          </Flex>
                        ))}
                      </Grid>
                    </MotionFlex>
                  )}

                  {!loading && !result && (
                    <MotionFlex
                      key="empty"
                      direction="column" align="center" gap={2} opacity={0.3}
                      initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} exit={{ opacity: 0 }}
                    >
                      <Text fontSize="48px">🧠</Text>
                      <Text fontSize="10px" letterSpacing="0.2em" color="#00ffe0">
                        AWAITING INPUT
                      </Text>
                    </MotionFlex>
                  )}
                </AnimatePresence>
              </Box>
            </GridItem>
          </Grid>
        </MotionBox>

        {/* Action buttons */}
        <MotionFlex
          gap={4}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Button
            onClick={handlePredict}
            isDisabled={!previewUrl || loading}
            size="md" bg="transparent"
            border="1px solid #00ffe0" color="#00ffe0"
            fontFamily="'IBM Plex Mono', monospace"
            fontSize="11px" letterSpacing="0.25em" px={8}
            _hover={{ bg: '#00ffe015', boxShadow: '0 0 20px #00ffe044' }}
            _disabled={{ opacity: 0.3, cursor: 'not-allowed' }}
            transition="all 0.2s"
          >
            {loading ? 'ANALYZING...' : 'PREDICT'}
          </Button>

          <AnimatePresence>
            {result && (
              <MotionBox
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.25 }}
              >
                <Button
                  onClick={() => setView('stats')}
                  size="md" bg="transparent"
                  border="1px solid #0080ff" color="#0080ff"
                  fontFamily="'IBM Plex Mono', monospace"
                  fontSize="11px" letterSpacing="0.25em" px={8}
                  _hover={{ bg: '#0080ff15', boxShadow: '0 0 20px #0080ff44' }}
                  transition="all 0.2s"
                >
                  SHOW STATS →
                </Button>
              </MotionBox>
            )}
          </AnimatePresence>
        </MotionFlex>

        {/* Meta strip */}
        <MotionFlex
          gap={6}
          initial={{ opacity: 0 }} animate={{ opacity: 0.4 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {META_STRIP.map(([label, val]) => (
            <Flex key={label} direction="column" align="center" gap={0}>
              <Text fontSize="8px" letterSpacing="0.2em" color="#ffffff55">{label}</Text>
              <Text fontSize="10px" color="#00ffe077">{val}</Text>
            </Flex>
          ))}
        </MotionFlex>
      </Flex>

      {/* ── Excalidraw fullscreen modal (plain fixed div, NOT a Portal) ───────── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            background: '#13181f'
          }}
        >
          {/* Toolbar */}
          <div style={{
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            background: '#0d1117',
            borderBottom: '1px solid #ffffff12',
            flexShrink: 0,
            fontFamily: 'IBM Plex Mono, monospace',
            zIndex: 10000
          }}>
            <span style={{ fontSize: '11px', letterSpacing: '0.25em', color: '#00ffe0', textTransform: 'uppercase' }}>
              Draw a digit (0–9)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '10px', color: '#ffffff44', letterSpacing: '0.1em' }}>STROKE</span>
              <input
                type="range" min={5} max={40} value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                style={{ width: '100px', accentColor: '#00ffe0', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '10px', color: '#00ffe0', width: '20px' }}>{strokeWidth}</span>
              <button
                onClick={handleClearCanvas}
                style={{
                  background: 'transparent', border: '1px solid #ff6b6b44',
                  color: '#ff6b6b', borderRadius: '4px',
                  padding: '4px 10px', cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '10px', letterSpacing: '0.15em'
                }}
              >
                CLEAR
              </button>
              <button
                onClick={handleCloseModal}
                style={{
                  background: '#00ffe015', border: '1px solid #00ffe044',
                  color: '#00ffe0', borderRadius: '4px',
                  padding: '4px 12px', cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '10px', letterSpacing: '0.15em'
                }}
              >
                DONE ✓
              </button>
            </div>
          </div>

          {/* Excalidraw editor — full height minus toolbar */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <Excalidraw
              ref={editorRef}
              theme="dark"
              initialData={{
                elements: sceneData.elements,
                appState: {
                  ...sceneData.appState,
                  currentItemStrokeWidth: strokeWidth / 10,
                  currentItemStrokeColor: '#ffffff',
                  viewBackgroundColor: '#13181f',
                  gridSize: null,
                  zenModeEnabled: false,
                  viewModeEnabled: false,
                  collaborators: new Map()
                },
                files: sceneData.files
              }}
              UIOptions={{
                canvasActions: {
                  changeViewBackgroundColor: false,
                  clearCanvas: false,
                  export: false,
                  loadScene: false,
                  saveAsImage: false,
                  saveToActiveFile: false,
                  toggleTheme: false
                }
              }}
            />
          </div>
        </div>
      )}
    </Box>
  )
}