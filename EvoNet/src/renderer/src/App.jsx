import { useState } from 'react'
import { Box, Text, Button, Input, Spinner } from '@chakra-ui/react'

const App = () => {
  const [image, setImage] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

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
    if (!image || loading) return

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
    <Box p={5}>
      <Text fontSize="2xl" mb={4}>EvoNet Test</Text>

      <Input type="file" accept="image/*" onChange={handleFile} />

      {image && (
        <Box mt={4}>
          <img src={image} width="120" />
        </Box>
      )}

      <Button mt={4} onClick={handlePredict} isLoading={loading}>
        {loading ? <Spinner /> : 'Predict'}
      </Button>

      {result && (
        <Box mt={4}>
          <Text>Prediction: {result.prediction}</Text>
          <Text>Confidence: {(result.confidence * 100).toFixed(2)}%</Text>
        </Box>
      )}
    </Box>
  )
}

export default App