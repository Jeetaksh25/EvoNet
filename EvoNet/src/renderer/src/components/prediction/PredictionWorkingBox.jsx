import { useEffect, useState, useRef } from 'react'
import { Box, Text, Flex, Spinner, Grid } from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePredictionStore } from '../../store/usePredictionStore'
import PredictionStep from './PredictionStep'
import ScanAnimation from './ScanAnimation'
import HeadingText from '../HeadingText'
import { theme } from '../../theme/theme'
import { handleToast } from '../../functions/HandleToast'
import { useNavigate } from 'react-router-dom'
import CustomButton from '../CustomButton'

const MotionBox = motion(Box)

const InfoPanel = ({ title, points }) => (
  <Box
    bg="rgba(255,255,255,0.02)"
    border="1px solid #ffffff0a"
    borderRadius="lg"
    p={4}
    minW="220px"
  >
    <Text
      fontSize="0.7em"
      letterSpacing="0.12em"
      textTransform="uppercase"
      color={theme.color.tertiary}
      mb={2}
    >
      {title}
    </Text>

    <Flex direction="column" gap={1}>
      {points.map((p, i) => (
        <Text key={i} fontSize="0.8em" color={theme.color.text} lineHeight={1.6}>
          • {p}
        </Text>
      ))}
    </Flex>
  </Box>
)

const ConfidenceBar = ({ digit, value, isTop }) => (
  <Flex align="center" gap={2}>
    <Text
      fontSize="1.2em"
      color={isTop ? '#00ffe0' : '#ffffff44'}
      fontWeight={isTop ? '700' : '400'}
      w="20px"
      textAlign="right"
      fontFamily="IBM Plex Mono, monospace"
    >
      {digit}
    </Text>
    <Box flex={1} h="0.8em" bg="#ffffff08" borderRadius="full" overflow="hidden">
      <MotionBox
        h="100%"
        borderRadius="full"
        initial={{ width: 0 }}
        animate={{ width: `${(value * 100).toFixed(1)}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        bg={
          isTop
            ? `linear-gradient(90deg, ${theme.color.primary}, ${theme.color.tertiary})`
            : `linear-gradient(90deg, ${theme.color.secondary}, ${theme.color.tertiary})`
        }
      />
    </Box>
    <Text
      fontSize="0.8em"
      color={isTop ? '#00ffe0' : '#ffffff33'}
      fontFamily="IBM Plex Mono, monospace"
      w="60px"
    >
      {(value * 100).toFixed(1)}%
    </Text>
  </Flex>
)

const StatusRow = ({ text }) => (
  <MotionBox
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    display="flex"
    alignItems="center"
    gap={3}
    py={3}
  >
    <Spinner size="sm" color="#00ffe0" sx={{ '--spinner-track-color': '#ffffff0a' }} />
    <Text fontSize="0.8em" letterSpacing="0.15em" color={theme.color.tertiary}>
      {text}
    </Text>
  </MotionBox>
)

const STEPS = {
  RAW: 'raw',
  PROCESSING: 'processing',
  SCANNING: 'scanning',
  RESULT: 'result'
}

const PredictionWorkingBox = ({ rawImageBase64, result }) => {
  const [step, setStep] = useState(() => (result ? STEPS.RESULT : STEPS.RAW))
  const bottomRef = useRef(null)
  const modelMeta = usePredictionStore((s) => s.modelMeta)

  const navigate = useNavigate()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [step])

  useEffect(() => {
    if (result) return

    const t1 = setTimeout(() => setStep(STEPS.PROCESSING), 1200)
    const t2 = setTimeout(() => setStep(STEPS.SCANNING), 3000)
    const t3 = setTimeout(() => setStep(STEPS.RESULT), 9500)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  const prediction = result?.prediction
  const allConf = result?.all_confidences ?? []
  const confidence = result?.confidence ?? 0

  const processedStyle = {
    filter: 'invert(1) contrast(1.6) brightness(1.2)',
    imageRendering: 'pixelated'
  }

  const [processedImage, setProcessedImage] = useState(null)

  useEffect(() => {
    if (result?.pixels) {
      const canvas = document.createElement('canvas')
      canvas.width = 16
      canvas.height = 16
      const ctx = canvas.getContext('2d')
      const imageData = ctx.createImageData(16, 16)

      result.pixels.forEach((v, i) => {
        const brightness = Math.round(v * 255)
        imageData.data[i * 4] = brightness
        imageData.data[i * 4 + 1] = brightness
        imageData.data[i * 4 + 2] = brightness
        imageData.data[i * 4 + 3] = 255
      })

      ctx.putImageData(imageData, 0, 0)
      setProcessedImage(canvas.toDataURL())
    }
  }, [result])

  return (
    <MotionBox
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      w="90%"
      mx="auto"
      bg="rgba(0,0,0,0.5)"
      border="1px solid #ffffff0a"
      borderRadius="2xl"
      p={8}
      display="flex"
      flexDirection="column"
      gap={10}
      my={10}
    >
      <Box display="flex" flexDirection="column" gap={4}>
        <HeadingText text={'Inference Engine'} fontSize={'0.8em'} lineHeight={1.2} />
        <HeadingText
          text={'Processing Your Digit'}
          fontWeight="700"
          fontSize={'1.2em'}
          lineHeight={1.2}
        />
      </Box>

      <PredictionStep label="Step 1: Raw Input" custom={0}>
        <Flex align="center" gap={10} justifyContent={'center'}>
          <Box
            as="img"
            src={rawImageBase64}
            w="160px"
            h="160px"
            objectFit="contain"
            border="1px solid #ffffff0f"
            borderRadius="md"
            bg="#080c10"
            style={{ imageRendering: 'pixelated' }}
          />
          <InfoPanel
            title="Input"
            points={[
              'Exported from Excalidraw canvas',
              'High-resolution drawing',
              'Not yet normalized'
            ]}
          />
        </Flex>
      </PredictionStep>

      <AnimatePresence>
        {step === STEPS.RAW && <StatusRow text="Exporting and normalising image..." />}
      </AnimatePresence>

      <AnimatePresence>
        {(step === STEPS.PROCESSING || step === STEPS.SCANNING || step === STEPS.RESULT) && (
          <PredictionStep label="Step 2: Preprocessed Input (16×16)" custom={1}>
            <Flex align="center" gap={10} justifyContent={'center'}>
              <Box
                as="img"
                src={processedImage}
                w="160px"
                h="160px"
                objectFit="contain"
                border="1px solid #ffffff0f"
                borderRadius="md"
                bg="#080c10"
                style={{ imageRendering: 'pixelated' }}
              />
              <InfoPanel
                title="Preprocessing Pipeline"
                points={[
                  'Convert to greyscale',
                  'Invert if bright background',
                  'Crop to digit bounding box',
                  'Scale + center in 20×20',
                  'Center-of-mass alignment',
                  'Resize → 16×16',
                  'Normalize to [-1, 1]',
                  `PCA projection: 256 → ${modelMeta?.pcaComponents ?? '…'} features`
                ]}
              />
            </Flex>
          </PredictionStep>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {step === STEPS.PROCESSING && (
          <StatusRow text={`Feeding ${modelMeta?.pcaComponents ?? 256}-dimensional PCA vector into neural network…`} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(step === STEPS.SCANNING || step === STEPS.RESULT) && (
          <PredictionStep label="Step 3: Neural Network Forward Pass" custom={2}>
            <Flex align="center" gap={10} justifyContent={'center'}>
              <ScanAnimation imageUrl={processedImage} width={180} height={180} />
              <InfoPanel
                title="Forward Pass"
                points={[
                  `Input layer (${modelMeta?.pcaComponents ?? '…'} PCA features)`,
                  `Hidden layer (${modelMeta?.hiddenSize ?? '…'} neurons, ReLU)`,
                  `Output layer (${modelMeta?.outputSize ?? 10} classes)`,
                  'Softmax with temperature scaling',
                  `Weights evolved via GA (${modelMeta?.generations ?? '…'} generations)`
                ]}
              />
            </Flex>
          </PredictionStep>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {step === STEPS.SCANNING && (
          <StatusRow text="Computing softmax probabilities across 10 classes..." />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {step === STEPS.RESULT && result && (
          <PredictionStep label="Step 4: Prediction Result" custom={3}>
            <Grid templateColumns="1fr 1fr" gap={8}>
              <Flex direction="column" align="center" justify="center" gap={4}>
                <Text
                  fontSize="1.2em"
                  letterSpacing="0.2em"
                  color={theme.color.tertiary}
                  textTransform="uppercase"
                >
                  Predicted Digit
                </Text>
                <MotionBox
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                  fontSize="10em"
                  fontWeight="900"
                  lineHeight={1}
                  color={theme.color.primary}
                  fontFamily="IBM Plex Mono, monospace"
                  style={{ textShadow: '0 0 40px #00ffe066' }}
                >
                  {prediction}
                </MotionBox>
                <Text fontSize="1em" color={theme.color.text}>
                  Confidence:{' '}
                  <Text as="span" fontWeight="700" color={theme.color.tertiary}>
                    {(confidence * 100).toFixed(2)}%
                  </Text>
                </Text>

                <CustomButton text="Stats" onClick={() => navigate('/stats')} />
              </Flex>

              <Flex direction="column" gap={2} justify="center">
                <Text
                  fontSize="1em"
                  letterSpacing="0.15em"
                  color={theme.color.tertiary}
                  textTransform="uppercase"
                  mb={1}
                >
                  All Classes
                </Text>
                {allConf.map((val, i) => (
                  <ConfidenceBar key={i} digit={i} value={val} isTop={i === prediction} />
                ))}
              </Flex>
            </Grid>
          </PredictionStep>
        )}
      </AnimatePresence>

      <div ref={bottomRef} />
    </MotionBox>
  )
}

export default PredictionWorkingBox
