import { useEffect, useRef } from 'react'
import { Box } from '@chakra-ui/react'
import { motion, useAnimation } from 'framer-motion'

const MotionBox = motion(Box)

const ScanAnimation = ({ imageUrl, width = 160, height = 160 }) => {
  const controls = useAnimation()

  useEffect(() => {
    const runScan = async () => {
      for (let i = 0; i < 3; i++) {
        await controls.start({
          top: `${height - 4}px`,
          transition: { duration: 1.4, ease: 'linear' }
        })
        await controls.start({
          top: '0px',
          transition: { duration: 1.4, ease: 'linear' }
        })
      }
    }
    runScan()
  }, [controls, height])

  return (
    <Box
      position="relative"
      w={`${width}px`}
      h={`${height}px`}
      borderRadius="md"
      overflow="hidden"
      border="1px solid #00ffe033"
    >
      <Box
        as="img"
        src={imageUrl}
        w="100%"
        h="100%"
        objectFit="contain"
        style={{ imageRendering: 'pixelated', filter: 'brightness(0.85)' }}
      />

      <Box
        position="absolute"
        inset={0}
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,255,224,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,224,0.04) 1px, transparent 1px)',
          backgroundSize: '10px 10px'
        }}
      />

      <MotionBox
        position="absolute"
        left={0}
        right={0}
        h="3px"
        initial={{ top: '0px' }}
        animate={controls}
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, #00ffe0 20%, #ffffff 50%, #00ffe0 80%, transparent 100%)',
          boxShadow: '0 0 12px 4px #00ffe066, 0 0 24px 8px #00ffe022',
          zIndex: 10
        }}
      />
      
      <MotionBox
        position="absolute"
        left={0}
        right={0}
        h="40px"
        initial={{ top: '0px' }}
        animate={controls}
        style={{
          background: 'linear-gradient(180deg, #00ffe011 0%, transparent 100%)',
          zIndex: 9,
          pointerEvents: 'none'
        }}
      />
    </Box>
  )
}

export default ScanAnimation