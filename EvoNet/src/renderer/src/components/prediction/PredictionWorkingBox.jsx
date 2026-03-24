import { useEffect, useState, useRef } from 'react'
import { Box, Text, Flex, Spinner, Grid } from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePredictionStore } from '../../store/usePredictionStore'
import PredictionStep from './PredictionStep'
import ScanAnimation from './ScanAnimation'
import HeadingText from '../HeadingText'
import { theme } from '../../theme/theme'

const MotionBox = motion(Box)

const ConfidenceBar = ({ digit, value, isTop }) => (
  <Flex align="center" gap={2}>
    <Text
      fontSize="11px"
      color={isTop ? '#00ffe0' : '#ffffff44'}
      fontWeight={isTop ? '700' : '400'}
      w="14px"
      textAlign="right"
      fontFamily="IBM Plex Mono, monospace"
    >
      {digit}
    </Text>
    <Box flex={1} h="6px" bg="#ffffff08" borderRadius="full" overflow="hidden">
      <MotionBox
        h="100%"
        borderRadius="full"
        initial={{ width: 0 }}
        animate={{ width: `${(value * 100).toFixed(1)}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        bg={isTop ? 'linear-gradient(90deg, #00ffe0, #0080ff)' : '#ffffff22'}
      />
    </Box>
    <Text
      fontSize="10px"
      color={isTop ? '#00ffe0' : '#ffffff33'}
      fontFamily="IBM Plex Mono, monospace"
      w="38px"
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
    <Spinner size="xs" color="#00ffe0" sx={{ '--spinner-track-color': '#ffffff0a' }} />
    <Text fontSize="11px" letterSpacing="0.15em" color="#00ffe066">
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
  const [step, setStep] = useState(STEPS.RAW)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [step])

  useEffect(() => {
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

  return (
    <MotionBox
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      w="90%"
      mx="auto"
      mt={6}
      bg="rgba(0,0,0,0.5)"
      border="1px solid #ffffff0a"
      borderRadius="2xl"
      p={8}
      display="flex"
      flexDirection="column"
      gap={6}
    >
      <Box>
        <HeadingText text={'Inference Engine'} fontSize={'0.8em'} lineHeight={1.2} />
        <HeadingText
          text={'Processing Your Digit'}
          fontWeight="700"
          fontSize={'1.2em'}
          lineHeight={1.2}
        />
      </Box>

      <PredictionStep label="Step 1 — Raw Input" custom={0}>
        <Flex align="center" gap={6} justifyContent={'center'}>
          <Box
            as="img"
            src={rawImageBase64}
            w="120px"
            h="120px"
            objectFit="contain"
            border="1px solid #ffffff0f"
            borderRadius="md"
            bg="#080c10"
            style={{ imageRendering: 'pixelated' }}
          />
          <Box>
            <Text fontSize={'0.8em'} color={theme.color.tertiary} lineHeight={1.8}>
              Original drawing exported from Excalidraw canvas.
              <br />
              Will be converted to greyscale, centered by
              <br />
              center-of-mass, and resized to 16×16 pixels.
            </Text>
          </Box>
        </Flex>
      </PredictionStep>

      <AnimatePresence>
        {step === STEPS.RAW && <StatusRow text="Exporting and normalising image..." />}
      </AnimatePresence>

      <AnimatePresence>
        {(step === STEPS.PROCESSING || step === STEPS.SCANNING || step === STEPS.RESULT) && (
          <PredictionStep label="Step 2 — Preprocessed Input (16×16)" custom={1}>
            <Flex align="center" gap={6} justifyContent={'center'}>
              <Box
                as="img"
                src={rawImageBase64}
                w="120px"
                h="120px"
                objectFit="contain"
                border="1px solid #ffffff0f"
                borderRadius="md"
                bg="#080c10"
                style={processedStyle}
              />
              <Box>
                <Text fontSize={'0.8em'} color={theme.color.tertiary} lineHeight={1.8}>
                  Greyscale → center-of-mass shift → resize 20×20
                  <br />
                  → pad to 28×28 → downsample to 16×16.
                  <br />
                  Pixel values normalised to [−1, 1].
                </Text>
              </Box>
            </Flex>
          </PredictionStep>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {step === STEPS.PROCESSING && (
          <StatusRow text="Feeding 256-dimensional vector into neural network..." />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(step === STEPS.SCANNING || step === STEPS.RESULT) && (
          <PredictionStep label="Step 3 — Neural Network Forward Pass" custom={2}>
            <Flex align="center" gap={6} justifyContent={'center'}>
              <ScanAnimation imageUrl={rawImageBase64} width={120} height={120} />
              <Box>
                <Text lineHeight={1.8} fontSize={'0.8em'} color={theme.color.tertiary}>
                  Input (256) → ReLU → Hidden (128)
                  <br />
                  → Output (10) → Softmax probabilities.
                  <br />
                  Weights evolved over 400 GA generations.
                </Text>
              </Box>
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
          <PredictionStep label="Step 4 — Prediction Result" custom={3}>
            <Grid templateColumns="1fr 1fr" gap={8}>
              <Flex direction="column" align="center" justify="center" gap={2}>
                <Text
                  fontSize="11px"
                  letterSpacing="0.2em"
                  color="#ffffff33"
                  textTransform="uppercase"
                >
                  Predicted Digit
                </Text>
                <MotionBox
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                  fontSize="96px"
                  fontWeight="900"
                  lineHeight={1}
                  color="#00ffe0"
                  fontFamily="IBM Plex Mono, monospace"
                  style={{ textShadow: '0 0 40px #00ffe066' }}
                >
                  {prediction}
                </MotionBox>
                <Text fontSize="12px" color="#ffffff55">
                  Confidence:{' '}
                  <Text as="span" color="#00ffe0" fontWeight="700">
                    {(confidence * 100).toFixed(2)}%
                  </Text>
                </Text>
              </Flex>

              <Flex direction="column" gap={2} justify="center">
                <Text
                  fontSize="10px"
                  letterSpacing="0.15em"
                  color="#ffffff33"
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
