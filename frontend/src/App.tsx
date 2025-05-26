import { useState } from 'react';

function App() {
  const [entry, setEntry] = useState('有人在黑夜中写下第一句话...');
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (input.trim()) {
      alert(`你写下了：${input}`);
      setInput('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 text-center font-sans">
      <h1 className="text-4xl font-bold mb-6 text-yellow-600">匿名接龙日记</h1>
      <p className="italic text-gray-700 mb-4">{entry}</p>

      <textarea
        rows={3}
        className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="接下去写点什么..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button
        onClick={handleSubmit}
        className="mt-4 px-6 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition"
      >
        提交接龙
      </button>
    </div>
  );
}

export default App;