import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Box, Text, Flex, Spinner, Portal } from '@chakra-ui/react'
import { Excalidraw, exportToBlob, exportToCanvas } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { motion } from 'framer-motion'
import { usePredictionStore } from '../../store/usePredictionStore'
import CustomButton from '../CustomButton'
import { FaPencilAlt } from 'react-icons/fa'
import HeadingText from '../HeadingText'
import { theme } from '../../theme/theme'

const MotionBox = motion(Box)

const ExcalidrawInput = forwardRef((props, ref) => {
  const excalidrawRef = useRef()
  const isOpenRef = useRef(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const excalidrawData = usePredictionStore((s) => s.excalidrawData)
  const excalidrawThumbnail = usePredictionStore((s) => s.excalidrawThumbnail)
  const setExcalidrawData = usePredictionStore((s) => s.setExcalidrawData)
  const setExcalidrawThumbnail = usePredictionStore((s) => s.setExcalidrawThumbnail)
  const setDrawnImageBase64 = usePredictionStore((s) => s.setDrawnImageBase64)
  const getDrawnImageBase64 = usePredictionStore((s) => s.getDrawnImageBase64)

  const excalidrawTheme = 'light'

  const openModal = () => {
    isOpenRef.current = true
    setIsOpen(true)
  }

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleClose = useCallback(async () => {
    isOpenRef.current = false
    setIsExporting(true)

    try {
      const api = excalidrawRef.current
      console.log('api:', api) // ← is the ref populated?

      if (!api) {
        setIsOpen(false)
        setIsExporting(false)
        return null
      }

      const elements = api.getSceneElements()
      const appState = api.getAppState()
      const files = api.getFiles?.() ?? {}
      const nonDeleted = elements.filter((el) => !el.isDeleted)

      console.log('nonDeleted count:', nonDeleted.length)

      setExcalidrawData({ elements: nonDeleted, appState, files })

      if (nonDeleted.length === 0) {
        setDrawnImageBase64(null)
        setExcalidrawThumbnail(null)
        setIsOpen(false)
        setIsExporting(false)
        return null
      }

      const blob = await exportToBlob({
        elements: nonDeleted,
        appState: { ...appState, exportBackground: true, exportWithDarkMode: false },
        files,
        mimeType: 'image/png'
      })

      const base64 = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.readAsDataURL(blob)
      })
      console.log('base64 length:', base64?.length)
      setDrawnImageBase64(base64)
      setExcalidrawThumbnail(base64)
      return base64
    } catch (err) {
      console.error(err)
      return null
    } finally {
      setIsOpen(false)
      setIsExporting(false)
    }
  }, [setExcalidrawData, setDrawnImageBase64, setExcalidrawThumbnail])

  // Expose to FrontPage: if modal open → export now, else → return stored value
  useImperativeHandle(
    ref,
    () => ({
      exportDrawing: async () => {
        if (isOpenRef.current) {
          return handleClose()
        }
        return getDrawnImageBase64() ?? null
      }
    }),
    [handleClose, getDrawnImageBase64]
  )

  const isEmpty = !excalidrawData?.elements?.length

  useEffect(() => {
    if (isOpen && excalidrawRef.current) {
      setTimeout(() => {
        excalidrawRef.current?.scrollToContent?.(excalidrawRef.current.getSceneElements(), {
          fitToContent: true,
          animate: false
        })
      }, 100)
    }
  }, [isOpen])

  return (
    <Box h={'100%'} w={'100%'} display="flex" alignItems="center" justifyContent="center">
      <MotionBox
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={openModal}
        cursor="pointer"
        border="2px dashed"
        borderColor={isEmpty ? '#00ffe044' : '#00ffe0aa'}
        borderRadius="xl"
        w="260px"
        h="200px"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        bg={isEmpty ? '#0d1117' : 'transparent'}
        overflow="hidden"
        position="relative"
        transition="border-color 0.2s"
      >
        {isEmpty ? (
          <Flex direction="column" align="center" gap={3} color="#00ffe066">
            <FaPencilAlt size={28} />
            <Text fontSize="13px" letterSpacing="0.15em" color="#00ffe099">
              DRAW YOUR DIGIT
            </Text>
            <Text fontSize="10px" color="#ffffff33" letterSpacing="0.1em">
              Click to open canvas
            </Text>
          </Flex>
        ) : (
          <>
            <Box
              as="img"
              src={excalidrawThumbnail}
              w="100%"
              h="100%"
              objectFit="contain"
              p={2}
              style={{ imageRendering: 'pixelated' }}
            />
            <Box
              position="absolute"
              inset={0}
              bg="blackAlpha.600"
              opacity={0}
              _hover={{ opacity: 1 }}
              display="flex"
              alignItems="center"
              justifyContent="center"
              transition="opacity 0.2s"
            >
              <Text fontSize="12px" letterSpacing="0.2em" color="#00ffe0">
                EDIT DRAWING
              </Text>
            </Box>
          </>
        )}
      </MotionBox>

      {isOpen && (
        <Portal>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              background: theme.color.secondary
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 20px',
                borderBottom: `1px solid ${theme.color.glow}`,
                flexShrink: 0
              }}
            >
              <HeadingText text="Draw your digit" fontSize="1.2em" />

              <CustomButton
                text="Done"
                onClick={handleClose}
                disabled={isExporting}
                loading={isExporting}
              />
            </div>

            <div
              style={{
                flex: 1,
                height: '100%',
                width: '100%',
                overflow: 'hidden'
              }}
            >
              <Excalidraw
                excalidrawAPI={(api) => {
                  excalidrawRef.current = api
                }}
                theme={excalidrawTheme}
                initialData={{
                  elements: excalidrawData?.elements ?? [],
                  appState: {
                    ...(excalidrawData?.appState ?? {}),
                    viewBackgroundColor: theme.color.secondary,
                    currentItemStrokeColor: '#ffffff',
                    currentItemBackgroundColor: 'transparent',
                    currentItemFillStyle: 'solid',
                    currentItemStrokeWidth: 2
                  },
                  files: excalidrawData?.files ?? {}
                }}
                UIOptions={{
                  canvasActions: {
                    changeViewBackgroundColor: false,
                    clearCanvas: true,
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
        </Portal>
      )}
    </Box>
  )
})

export default ExcalidrawInput
