import { useState, useRef, useCallback } from 'react'
import { Box, Text, Button, Flex, Grid, GridItem, Spinner, Image, Input } from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { theme } from '../theme/theme'

const MotionBox = motion(Box)
const MotionText = motion(Text)
const MotionFlex = motion(Flex)
const MotionButton = motion(Button)

const CustomButton = ({ onClick, loading, text, iconLeft, iconRight, fontSize = 'sm', ...props }) => {
  return (
    <MotionButton
      onClick={onClick}
      isLoading={loading}
      bg={theme.color.secondary}
      border={`1px solid ${theme.color.primary}`}
      color={theme.color.primary}
      fontSize={fontSize}
      letterSpacing="0.20em"
      px={6}
      borderRadius={'sm'}
      fontFamily={theme.font.primary}
      _hover={{ bg: '#00ffe015', boxShadow: `0 0 20px ${theme.color.glow}` }}
      _disabled={{ opacity: 0.3, cursor: 'not-allowed' }}
      transition="all 0.25s"
      cursor="pointer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      {...props}
    >
      {iconLeft}
      {text}
      {iconRight}
      {loading && <Spinner />}
    </MotionButton>
  )
}

export default CustomButton
