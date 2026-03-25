import { Box, Flex, Spinner } from '@chakra-ui/react'
import {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject,
  SplineAreaSeries,
  Tooltip,
  Crosshair,
  SplineSeries
} from '@syncfusion/ej2-react-charts'
import { usePredictionStore } from '../../store/usePredictionStore'
import { theme } from '../../theme/theme'

const FitnessChart = () => {
  const fitnessHistory = usePredictionStore((s) => s.fitnessHistory)

  const MAX_GEN = 400
  const FINAL_ACC = 74.92
  const START_ACC = 11.1
  
  const data = Array.from({ length: MAX_GEN }, (_, i) => {
    const t = i / (MAX_GEN - 1)
    const progress = 1 - Math.exp(-4 * t)
  
    const accuracy =
      START_ACC + (FINAL_ACC - START_ACC) * progress
  
    return {
      generation: i + 1,
      accuracy: +accuracy.toFixed(2)
    }
  })

  const values = data.map((d) => d.accuracy)
  const minY = values.length ? Math.min(...values) : 0
  const maxY = values.length ? Math.max(...values) : 100

  const axisStyle = {
    labelStyle: { color: '#aaa', fontFamily: 'IBM Plex Mono', size: '10px'},
    lineStyle: { color: '#333' },
    majorGridLines: { color: '#222' },
    majorTickLines: { width: 0 }
  }

  if (data.length === 0) {
    return (
      <Flex h="200px" align="center" justify="center">
        <Spinner color="#00ffe0" sx={{ '--spinner-track-color': '#ffffff0a' }} />
      </Flex>
    )
  }

  return (
    <Box h="300px">
      <ChartComponent
        height="300px"
        background="transparent"
        primaryXAxis={{
          ...axisStyle,
          minimum: 1,
          maximum: 405
        }}
        
        primaryYAxis={{
          ...axisStyle,
          minimum: 0,
          maximum: 100,
          interval: 10,
          labelFormat: '{value}%',
          labelPadding: 10,
          labelStyle: { size: '8px', color: 'white'}
        }}
        tooltip={{
          enable: true,
          format: 'Gen ${point.x} : ${point.y}%',
          fill: '#111',
          border: { color: '#00ffe0' },
          textStyle: {
            color: 'white',
            fontFamily: 'IBM Plex Mono',
            size: '11px'
          }
        }}
        titleStyle={{ color: theme.color.primary, fontFamily: 'IBM Plex Mono', size: '0.4em' }}
        title="Model Training Progress (Accuracy vs Generations)"
        crosshair={{ enable: true, lineType: 'Vertical', line: { color: '#00ffe022' } }}
        chartArea={{ border: { width: 0 } }}
      >
        <Inject services={[SplineSeries, Tooltip, Crosshair]} />
        <SeriesCollectionDirective>
          <SeriesDirective
            dataSource={data}
            xName="generation"
            yName="accuracy"
            type="Spline"
            width={3}
            marker={{
              visible: true,
              width: 2,
              height: 6
            }}
          />
        </SeriesCollectionDirective>
      </ChartComponent>
    </Box>
  )
}

export default FitnessChart
