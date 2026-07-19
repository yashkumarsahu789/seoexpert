import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './keyword-pages.css'
import AdminApp from './pages/AdminApp'
import KeywordPageRoute from './pages/KeywordPageRoute'
import KeywordPreviewRoute from './pages/KeywordPreviewRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/p/:slug" element={<KeywordPageRoute />} />
        <Route path="/preview" element={<KeywordPreviewRoute />} />
        <Route path="/*" element={<AdminApp />} />
      </Routes>
    </BrowserRouter>
  )
}
