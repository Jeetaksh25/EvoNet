import { Box, Text } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { theme } from '../../theme/theme'

const MotionBox = motion(Box)

const StatCard = ({ label, children, custom = 0, h, ...props }) => (
  <MotionBox
    bg={theme.color.secondary}
    border="1px solid #ffffff0f"
    borderRadius="xl"
    p={5}
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay: custom * 0.08 }}
    h={h}
    {...props}
  >
    {label && (
      <Text
        fontSize="1em"
        letterSpacing="0.2em"
        color="#00ffe088"
        textTransform="uppercase"
        mb={3}
        fontWeight="600"
      >
        {label}
      </Text>
    )}
    {children}
  </MotionBox>
)

export default StatCard