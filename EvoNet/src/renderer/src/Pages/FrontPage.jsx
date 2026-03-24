import { useState, useRef } from 'react'
import { Box, Text, Flex } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import CustomButton from '../components/CustomButton'
import HeadingText from '../components/HeadingText'
import ExcalidrawInput from '../components/prediction/ExcalidrawInput'
import PredictionWorkingBox from '../components/prediction/PredictionWorkingBox'
import { usePredictionStore } from '../store/usePredictionStore'
import { handleToast } from '../functions/HandleToast'
import { theme } from '../theme/theme'

const MotionBox = motion(Box)

const FrontPage = () => {
  const [loading, setLoading] = useState(false)
  const [showWorking, setShowWorking] = useState(false)
  const [predictionImage, setPredictionImage] = useState(null)
  const excalidrawInputRef = useRef()

  const navigate = useNavigate()

  const drawnImageBase64 = usePredictionStore((s) => s.drawnImageBase64)
  const excalidrawData = usePredictionStore((s) => s.excalidrawData)
  const result = usePredictionStore((s) => s.result)
  const setResult = usePredictionStore((s) => s.setResult)
  const exportDrawing = usePredictionStore((s) => s.exportDrawing)

  const isEmpty =
    !excalidrawData || !excalidrawData.elements || excalidrawData.elements.length === 0

  const handlePredict = async () => {
    const latestBase64 = await excalidrawInputRef.current?.exportDrawing()
    console.log('ref:', excalidrawInputRef.current) // ← is ref attached?
    console.log('latestBase64:', latestBase64?.length) // ← what came back?
    if (loading) return

    if (isEmpty) {
      handleToast('error', 'Please draw a digit first')
      return
    }

    // Always go through the ref — it handles both cases internally
    // const latestBase64 = await excalidrawInputRef.current?.exportDrawing()

    if (!latestBase64) {
      handleToast('error', 'Please draw a digit first')
      return
    }

    setLoading(true)
    setShowWorking(false)
    setResult(null)
    setPredictionImage(latestBase64)
    await new Promise((r) => setTimeout(r, 100))
    setShowWorking(true)

    try {
      const res = await window.api.predictDigit(latestBase64)
      setResult(res)
      handleToast('success', `Prediction complete — digit is ${res.prediction}`)
    } catch (err) {
      console.error(err)
      handleToast('error', 'Prediction failed')
    }

    setLoading(false)
  }

  return (
    <Box
      w="100%"
      minH="100vh"
      color={theme.color.text}
      display="flex"
      flexDirection="column"
      alignItems="center"
      pb={16}
    >
      <Box textAlign="center" pt={10} mb={8}>
        <HeadingText text="EvoNet" fontSize="2.5em" />
        <HeadingText
          text="A neural network optimized with genetic evolutionary algorithms for accurate handwritten digit recognition."
          fontSize="0.8em"
        />
      </Box>

      <Flex direction="column" align="center" gap={6} w="100%">
        <ExcalidrawInput ref={excalidrawInputRef} />

        <Flex gap={4} align="center">
          <CustomButton
            text={loading ? 'Predicting...' : 'Predict'}
            onClick={handlePredict}
            loading={loading}
          />
          <CustomButton text="Stats" onClick={() => navigate('/stats')} />
        </Flex>
      </Flex>

      {showWorking && predictionImage && (
        <PredictionWorkingBox rawImageBase64={predictionImage} result={result} />
      )}
    </Box>
  )
}

export default FrontPage
