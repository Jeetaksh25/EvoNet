import Versions from './components/Versions'
import electronLogo from './assets/electron.svg'
import { Box, Text } from '@chakra-ui/react'
import { useColorMode, useColorModeValue, ColorModeButton } from '../../components/ui/color-mode'

const App = () => {

  return (
    <Box>
      <ColorModeButton/>
      <Text>EvoNet</Text>
    </Box>
  )
}

export default App
