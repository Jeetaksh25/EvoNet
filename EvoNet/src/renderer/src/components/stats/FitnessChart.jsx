import { Box, Flex, Spinner } from '@chakra-ui/react'
import {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject,
  SplineAreaSeries,
  Tooltip,
  Crosshair
} from '@syncfusion/ej2-react-charts'
import { usePredictionStore } from '../../store/usePredictionStore'

const axisStyle = {
  labelStyle: { color: '#ffffff44', fontFamily: 'IBM Plex Mono', size: '10px' },
  lineStyle: { color: '#ffffff12' },
  majorGridLines: { color: '#ffffff08' },
  majorTickLines: { width: 0 }
}

const FitnessChart = () => {
  const fitnessHistory = usePredictionStore((s) => s.fitnessHistory)

  const data = fitnessHistory.map((v, i) => ({
    x: i,
    y: parseFloat((v * 100).toFixed(2))
  }))

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
        primaryYAxis={{ ...axisStyle, minimum: 60, maximum: 80, labelFormat: '{value}%' }}
        tooltip={{
          enable: true,
          fill: '#0d1117',
          border: { color: '#00ffe044' },
          textStyle: { fontFamily: 'IBM Plex Mono', color: '#00ffe0', size: '10px' }
        }}
        crosshair={{ enable: true, lineType: 'Vertical', line: { color: '#00ffe022' } }}
        chartArea={{ border: { width: 0 } }}
      >
        <Inject services={[SplineAreaSeries, Tooltip, Crosshair]} />
        <SeriesCollectionDirective>
          <SeriesDirective
            dataSource={data}
            xName="x"
            yName="y"
            type="SplineArea"
            fill="#00ffe010"
            border={{ color: '#00ffe0', width: 2 }}
            opacity={0.6}
          />
        </SeriesCollectionDirective>
      </ChartComponent>
    </Box>
  )
}

export default FitnessChart