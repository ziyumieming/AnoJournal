import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between">
        <Link to="/" className="font-bold text-xl">我的应用</Link>
        
        <div className="flex gap-4">
          <Link to="/" className="hover:text-yellow-400">首页</Link>
          <Link to="/diary" className="hover:text-yellow-400">接龙日记</Link>
          {/* 更多导航链接 */}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;