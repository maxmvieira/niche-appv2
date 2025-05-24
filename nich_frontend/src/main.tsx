import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Importa o componente principal da aplicação Nich
import Home from './app/page' 

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Renderiza o componente Home (Nich) em vez do App padrão */}
    <Home />
  </StrictMode>,
)

