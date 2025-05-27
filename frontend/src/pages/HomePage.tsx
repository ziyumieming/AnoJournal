import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="max-w-4xl mx-auto p-8 text-center">
      <h1 className="text-4xl font-bold mb-6">欢迎使用我的应用</h1>
      <p className="mb-6">这是我的 React 应用主页</p>
      
      <div className="flex justify-center gap-4">
        <Link 
          to="/diary" 
          className="px-6 py-2 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition"
        >
          进入接龙日记
        </Link>
        {/* 其他导航链接 */}
      </div>
    </div>
  );
}

export default HomePage;