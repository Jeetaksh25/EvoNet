import { useState, useRef, useCallback } from 'react'
import { Box, Text, Button, Flex, Grid, GridItem, Spinner, Image, Input } from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { theme } from '../theme/theme'

const MotionBox = motion(Box)
const MotionText = motion(Text)
const MotionFlex = motion(Flex)

const HeadingText = ({ text, fontSize = '2em', ...props }) => {
  return (
    <MotionText
      fontSize={fontSize}
      color={theme.color.primary}
      fontFamily={theme.font.primary}
      userSelect="none"
      cursor="pointer"
      letterSpacing="0.10em"
      transition="all 0.25s ease"
      _hover={{
        textShadow: '0 0 4px #00ffe0, 0 0 1px #4dfff3'
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      {...props}
    >
      {text}
    </MotionText>
  )
}

export default HeadingText
