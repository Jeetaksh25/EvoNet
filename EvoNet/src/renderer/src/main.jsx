import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { HashRouter, BrowserRouter } from 'react-router-dom'
import { ColorModeProvider } from '../../components/ui/color-mode'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import '@chakra-ui/react'
import './main.css'
import { registerLicense } from '@syncfusion/ej2-base'

registerLicense('Ngo9BigBOggjHTQxAR8/V1JHaF5cWWZCf1FpRmJGdld5fUVHYVZUTXxaS00DNHVRdkdlWXxcdHRURWhfWEF3XkpWYEo=')

const Router = import.meta.env.DEV ? BrowserRouter : HashRouter

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ChakraProvider value={defaultSystem}>
      <ColorModeProvider>
        <Router>
          <App />
        </Router>
      </ColorModeProvider>
    </ChakraProvider>
  </StrictMode>
)
