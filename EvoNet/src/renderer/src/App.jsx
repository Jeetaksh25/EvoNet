import { useState, useRef, useCallback } from 'react'
import { Box, Text, Button, Flex, Grid, GridItem, Spinner, Image, Input } from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import '@excalidraw/excalidraw/index.css'
import Background from './components/Background'
import { theme } from './theme/theme'
import { Routes, Route, useNavigate } from 'react-router-dom'
import FrontPage from './Pages/FrontPage'
import  StatsPage  from './Pages/Statspage'
import { ToastContainer } from 'react-toastify'

const MotionBox = motion(Box)

const App = () => {
  const [result, setResult] = useState(null)
  const navigate = useNavigate()

  return (
    <MotionBox
      bg={theme.color.secondary}
      w="100%"
      minH="100vh"
      color={theme.color.text}
      overflow="hidden"
      position="relative"
    >
      <Background />

      <Routes>
        <Route
          path="/"
          element={
            <Flex minH="100vh" align="center" justify="center">
              <FrontPage />
            </Flex>
          }
        />

        <Route path="/stats" element={<StatsPage result={result} onBack={() => navigate('/')} />} />
      </Routes>

      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </MotionBox>
  )
}

export default App
