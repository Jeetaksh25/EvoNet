import { useState, useEffect } from 'react'
import { Box } from '@chakra-ui/react'
import { theme } from '../theme/theme'

const Background = () => {
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPos({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return (
    <Box position="fixed" inset={0} zIndex={0} pointerEvents={'none'} overflow={'hidden'}>
      <Box
        position="absolute"
        inset={0}
        opacity={0.075}
        backgroundImage={`
          linear-gradient(${theme.color.primary} 1px, transparent 1px),
          linear-gradient(90deg, ${theme.color.primary} 1px, transparent 1px)
        `}
        backgroundSize="40px 40px"
      />
      <Box
        position="absolute"
        inset={0}
        pointerEvents="none"
        backgroundImage={`
          linear-gradient(${theme.color.primary} 1px, transparent 1px),
          linear-gradient(90deg, ${theme.color.primary} 1px, transparent 1px)
        `}
        backgroundSize="40px 40px"
        style={{
          maskImage: `radial-gradient(
            circle 70px at ${pos.x}px ${pos.y}px,
            rgba(0,0,0,1),
            rgba(0,0,0,0)
          )`,
          WebkitMaskImage: `radial-gradient(
            circle 70px at ${pos.x}px ${pos.y}px,
            rgba(0,0,0,1),
            rgba(0,0,0,0)
          )`,
          transform: `translate(
            ${Math.sin(pos.x * 0.02) * 10}px,
            ${Math.cos(pos.y * 0.02) * 10}px
          )`,
          opacity: 0.75,
          filter: 'drop-shadow(0 0 6px #00ffe0)'
        }}
      />
    </Box>
  )
}

export default Background
