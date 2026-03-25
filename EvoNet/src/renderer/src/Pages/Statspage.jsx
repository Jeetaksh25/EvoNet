import { useEffect } from 'react'
import { Box, Text, Flex, Grid, GridItem } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { IoIosArrowRoundBack } from 'react-icons/io'
import { usePredictionStore } from '../store/usePredictionStore'
import CustomButton from '../components/CustomButton'
import HeadingText from '../components/HeadingText'
import StatCard from '../components/stats/StatCard'
import NeuralNetViz from '../components/stats/NeuralNetViz'
import FitnessChart from '../components/stats/FitnessChart'
import ConfidenceChart from '../components/stats/ConfidenceChart'
import PixelHeatmap from '../components/stats/PixelHeatmap'
import { theme } from '../theme/theme'

const MotionBox = motion(Box)
const MotionGrid = motion(Grid)

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.45, delay: i * 0.08 } })
}

const StatsPage = () => {
  const navigate = useNavigate()

  const fitnessHistory = usePredictionStore((s) => s.fitnessHistory)
  const modelMeta = usePredictionStore((s) => s.modelMeta)
  const setFitnessHistory = usePredictionStore((s) => s.setFitnessHistory)
  const setModelMeta = usePredictionStore((s) => s.setModelMeta)

  useEffect(() => {
    if (fitnessHistory.length === 0) {
      window.api.getFitnessHistory().then(setFitnessHistory)
    }
    if (!modelMeta) {
      window.api.getModelMeta().then(setModelMeta)
    }
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  return (
    <Box w="100%" minH="100vh" display="flex" justifyContent="center" alignItems="flex-start">
      <Box
        w="90%"
        mx="auto"
        position="relative"
        zIndex={1}
        p={10}
        bg="rgba(0,0,0,0.5)"
        my={8}
        borderRadius="2xl"
      >
        <MotionBox variants={fadeUp} initial="hidden" animate="show" custom={0} mb={8}>
          <Flex align="center" justify="space-between">
            <HeadingText text="Model Analytics" />
            <CustomButton
              text="Back"
              onClick={() => navigate('/')}
              iconLeft={<IoIosArrowRoundBack />}
            />
          </Flex>
        </MotionBox>

        {modelMeta && (
          <MotionGrid
            templateColumns="repeat(4, 1fr)"
            gap={4}
            mb={6}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
          >
            {[
              { label: 'Architecture', val: modelMeta.architecture },
              { label: 'Total Params', val: modelMeta.totalParams.toLocaleString() },
              { label: 'Activation', val: modelMeta.activation },
              { label: 'Val Accuracy', val: `${(modelMeta.valAccuracy * 100).toFixed(2)}%` }
            ].map(({ label, val }) => (
              <GridItem key={label}>
                <Box
                  bg={theme.color.secondary}
                  border="1px solid #ffffff0f"
                  borderRadius="xl"
                  p={4}
                >
                  <Text
                    fontSize="0.9em"
                    letterSpacing="0.2em"
                    color={theme.color.primary}
                    textTransform="uppercase"
                    mb={1}
                  >
                    {label}
                  </Text>
                  <Text fontSize="1.2em" fontWeight="700" color={theme.color.tertiary}>
                    {val}
                  </Text>
                </Box>
              </GridItem>
            ))}
          </MotionGrid>
        )}

        <Grid templateColumns="1.6fr 1fr" gap={6} mb={6}>
          <StatCard label="Fitness History: 400 Generations" custom={2} h="370px">
            <FitnessChart />
          </StatCard>
          <StatCard label="3D Neural Network" custom={3} h="370px">
            <NeuralNetViz />
          </StatCard>
        </Grid>

        <Grid templateColumns="1fr 1fr" gap={6} mb={6}>
          <StatCard label="Confidence per Digit" custom={4} h="280px">
            <ConfidenceChart />
          </StatCard>
          <StatCard label="Processed Input: 16×16 Heatmap" custom={5} h="280px">
            <PixelHeatmap />
          </StatCard>
        </Grid>

        <StatCard label="Genetic Algorithm Parameters" custom={6}>
          <Grid templateColumns="repeat(6, 1fr)" gap={4}>
            {[
              ['Population', '300'],
              ['Generations', '400'],
              ['Mutation Rate', '5% → 1%'],
              ['Elite Size', '6'],
              ['Tournament', '7'],
              ['Crossover', 'Uniform + Blend']
            ].map(([label, val]) => (
              <Box key={label} textAlign="center">
                <Text
                  fontSize="0.8em"
                  letterSpacing="0.15em"
                  color={theme.color.primary}
                  textTransform="uppercase"
                  mb={1}
                >
                  {label}
                </Text>
                <Text fontSize="1em" fontWeight="600" color={theme.color.tertiary}>
                  {val}
                </Text>
              </Box>
            ))}
          </Grid>
        </StatCard>
      </Box>
    </Box>
  )
}

export default StatsPage
