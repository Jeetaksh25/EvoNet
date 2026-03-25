import { Box, Flex, Text } from '@chakra-ui/react'
import {
  HeatMapComponent,
  Legend as HeatLegend,
  Tooltip as HeatTooltip,
  Adaptor
} from '@syncfusion/ej2-react-heatmap'
import { Inject } from '@syncfusion/ej2-react-heatmap'
import { usePredictionStore } from '../../store/usePredictionStore'

const axisLabels16 = Array.from({ length: 16 }, (_, i) => String(i))

const PixelHeatmap = () => {
  const result = usePredictionStore((s) => s.result)

  const heatmapData = []
  if (result?.pixels) {
    for (let row = 0; row < 16; row++) {
      const rowData = []
      for (let col = 0; col < 16; col++) {
        rowData.push(parseFloat((result.pixels[row * 16 + col] * 100).toFixed(1)))
      }
      heatmapData.push(rowData)
    }
  }

  if (heatmapData.length === 0) {
    return (
      <Flex h="200px" align="center" justify="center" opacity={0.3}>
        <Text fontSize="11px" letterSpacing="0.2em" color="#00ffe0">
          NO PREDICTION YET
        </Text>
      </Flex>
    )
  }

  return (
    <Box h="370px">
      <HeatMapComponent
        height="290px"
        xAxis={{
          labels: axisLabels16,
          labelStyle: { color: 'transparent' },
          border: { width: 0 }
        }}
        yAxis={{
          labels: axisLabels16,
          labelStyle: { color: 'transparent' },
          border: { width: 0 }
        }}
        dataSource={heatmapData}
        paletteSettings={{
          palette: [
            { color: '#080c10', value: 0 },
            { color: '#003366', value: 30 },
            { color: '#0080ff', value: 60 },
            { color: '#00ffe0', value: 100 }
          ],
          type: 'Gradient'
        }}
        cellSettings={{ border: { width: 0 }, showLabel: false }}
        legendSettings={{ visible: false }}
        tooltipSettings={{
          enable: true,
          fill: '#0d1117',
          textStyle: { fontFamily: 'IBM Plex Mono', size: '10px', color: '#00ffe0' }
        }}
      >
        <Inject services={[HeatLegend, HeatTooltip, Adaptor]} />
      </HeatMapComponent>
    </Box>
  )
}

export default PixelHeatmap