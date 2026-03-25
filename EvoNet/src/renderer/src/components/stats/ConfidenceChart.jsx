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
import { theme } from '../../theme/theme'

const axisStyle = {
  labelStyle: { color: theme.color.text, fontFamily: 'IBM Plex Mono', size: '0.8em' },
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
    <Flex direction="column" h="370px">
      {result && (
        <Box
          alignSelf="flex-end"
          px={2}
          py="2px"
          bg="#00ffe015"
          color="#00ffe0"
          border="1px solid #00ffe033"
          borderRadius="full"
          fontSize="0.8em"
          letterSpacing="0.1em"
        >
          Predicted: {result.prediction}
        </Box>
      )}
      <ChartComponent
        height="280px"
        background="transparent"
        primaryXAxis={{ ...axisStyle, valueType: 'Category' }}
        primaryYAxis={{ ...axisStyle, minimum: 0, maximum: 100, labelFormat: '{value}%' }}
        tooltip={{
          enable: true,
          fill: theme.color.secondary,
          border: { color: theme.color.primary },
          textStyle: { fontFamily: 'IBM Plex Mono', color: theme.color.text, size: '12px' }
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
            fill={theme.color.tertiary}
            opacity={1}
            cornerRadius={{ topLeft: 3, topRight: 3 }}
          />
        </SeriesCollectionDirective>
      </ChartComponent>
    </Flex>
  )
}

export default ConfidenceChart
