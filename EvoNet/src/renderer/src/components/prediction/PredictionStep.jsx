import { Box, Text, Flex, Spinner } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { theme } from '../../theme/theme'

const MotionBox = motion(Box)

const PredictionStep = ({ label, children, isLoading = false, custom = 0 }) => {
  return (
    <MotionBox
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: custom * 0.1 }}
      bg="#0d1117"
      border="1px solid #ffffff0f"
      borderRadius="xl"
      p={5}
      display="flex"
      flexDirection="column"
      gap={4}
    >
      <Flex align="center" justify="space-between">
        <Text
          fontSize='0.8em'
          letterSpacing="0.2em"
          color={theme.color.primary}
          textTransform="uppercase"
          fontWeight="600"
        >
          {label}
        </Text>
        {isLoading && (
          <Spinner size="xs" color={theme.color.primary} sx={{ '--spinner-track-color': '#ffffff0a' }} />
        )}
      </Flex>
      <Box>{children}</Box>
    </MotionBox>
  )
}

export default PredictionStep