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

  const data = fitnessHistory.map((v, i) => ({
    generation: i + 1,
    accuracy: +(v * 100).toFixed(2)
  }))

  const values = data.map((d) => d.accuracy)
  const minY = values.length ? Math.min(...values) : 0
  const maxY = values.length ? Math.max(...values) : 100

  const axisStyle = {
    labelStyle: { color: '#aaa', fontFamily: 'IBM Plex Mono', size: '10px' },
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
    <Box h="200px">
      <ChartComponent
        height="200px"
        background="transparent"
        primaryXAxis={{ ...axisStyle, minimum: 0, maximum: fitnessHistory.length }}
        primaryYAxis={{
          ...axisStyle,
          minimum: Math.floor(minY - 2),
          maximum: Math.ceil(maxY + 2),
          labelFormat: '{value}%'
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
              width: 6,
              height: 6
            }}
          />
        </SeriesCollectionDirective>
      </ChartComponent>
    </Box>
  )
}

export default FitnessChart
