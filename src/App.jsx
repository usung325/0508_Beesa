// src/App.jsx
import CallManagementTest from "./components/CallManagementTest";

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white p-4">
        <h1 className="text-2xl font-bold">Call Transcription System</h1>
      </header>

      <main className="p-4">
        <CallManagementTest />
      </main>

      <footer className="p-4 text-center text-gray-500 text-sm mt-8">
        Call Management System Demo - {new Date().getFullYear()}
      </footer>
    </div>
  );
}

export default App;
