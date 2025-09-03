import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div className="flex justify-center gap-6 mt-10">
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>

      <h1 className="text-4xl font-bold text-center mt-6">Vite + React + Tailwind</h1>

      <div className="card flex flex-col items-center gap-4 mt-8">
        <button
          onClick={() => setCount((count) => count + 1)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
        >
          count is {count}
        </button>
        <p className="text-gray-700">
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>

      {/* ✅ Tailwind test block */}
     <div className="mt-10 flex justify-center">
        <div className="p-6 bg-green-100 border border-green-300 rounded-lg shadow">
          <p className="text-green-800 font-medium">🎉 Tailwind v4 is working!</p>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={() => setCount(c => c + 1)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
        >
          count is {count}
        </button>
      </div>
    </>
  )
}

export default App
