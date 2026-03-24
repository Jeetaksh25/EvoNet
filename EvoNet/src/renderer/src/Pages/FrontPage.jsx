import { useState, useRef, useCallback } from 'react'
import { Box, Text, Button, Flex, Grid, GridItem, Spinner, Image, Input } from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import CustomButton from '../components/CustomButton'
import HeadingText from '../components/HeadingText'
import { theme } from '../theme/theme'
import { useNavigate } from 'react-router-dom'
import { handleToast } from '../functions/HandleToast'

const MotionBox = motion(Box)
const MotionText = motion(Text)
const MotionFlex = motion(Flex)

const FrontPage = () => {
  const [image, setImage] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setResult(null)

    const reader = new FileReader()
    reader.onload = () => {
      setImage(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handlePredict = async () => {
    if (loading) return

    if (!image || image === '') {
      handleToast('error', 'Please select an image')
      return
    }

    setLoading(true)
    try {
      const res = await window.api.predictDigit(image)
      setResult(res)
      console.log(res)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <Box
      p={5}
      w={'100%'}
      h={'100vh'}
      color={theme.color.text}
      textAlign={'center'}
      display={'flex'}
      flexDirection={'column'}
      alignItems={'center'}
      justifyContent={'center'}
      gap={6}
    >
      <HeadingText
        text="EvoNet"
        fontSize="2.5em"
        position="absolute"
        top={5}
        textAlign={'center'}
        mx="auto"
      />

      <Input
        type="file"
        accept="image/*"
        onChange={handleFile}
        w={'max-content'}
        placeholder="Select an image"
        flexDir={'column'}
        display={'flex'}
        variant={'flushed'}
        zIndex={999}
      />

      {image && (
        <Box mt={4}>
          <img src={image} width="120" />
        </Box>
      )}

      <CustomButton
        text={loading ? 'Predicting ' : 'Predict'}
        onClick={handlePredict}
        loading={loading}
      />

      {result && (
        <Box mt={4}>
          <Text>Prediction: {result.prediction}</Text>
          <Text>Confidence: {(result.confidence * 100).toFixed(2)}%</Text>
        </Box>
      )}
      <CustomButton text={'Stats'} onClick={() => navigate('/stats')} />
    </Box>
  )
}

export default FrontPage
