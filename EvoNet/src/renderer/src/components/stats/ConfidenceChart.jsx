import { Box, Flex, Text } from '@chakra-ui/react'
import {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject,
  ColumnSeries,
  Category,
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

const ConfidenceChart = () => {
  const result = usePredictionStore((s) => s.result)

  const confidenceData = (result?.all_confidences ?? Array(10).fill(0)).map((v, i) => ({
    x: String(i),
    y: parseFloat((v * 100).toFixed(2))
  }))

  return (
    <Flex direction="column" h="200px">
      {result && (
        <Box
          alignSelf="flex-end"
          mb={2}
          px={2}
          py="2px"
          bg="#00ffe015"
          color="#00ffe0"
          border="1px solid #00ffe033"
          borderRadius="full"
          fontSize="10px"
          letterSpacing="0.1em"
        >
          Predicted: {result.prediction}
        </Box>
      )}
      <ChartComponent
        height="180px"
        background="transparent"
        primaryXAxis={{ ...axisStyle, valueType: 'Category' }}
        primaryYAxis={{ ...axisStyle, minimum: 0, maximum: 100, labelFormat: '{value}%' }}
        tooltip={{
          enable: true,
          fill: '#0d1117',
          border: { color: '#0080ff44' },
          textStyle: { fontFamily: 'IBM Plex Mono', color: '#0080ff', size: '10px' }
        }}
        chartArea={{ border: { width: 0 } }}
      >
        <Inject services={[ColumnSeries, Category, Tooltip, Crosshair]} />
        <SeriesCollectionDirective>
          <SeriesDirective
            dataSource={confidenceData}
            xName="x"
            yName="y"
            type="Column"
            fill="#0080ff"
            opacity={0.8}
            cornerRadius={{ topLeft: 3, topRight: 3 }}
          />
        </SeriesCollectionDirective>
      </ChartComponent>
    </Flex>
  )
}

export default ConfidenceChart