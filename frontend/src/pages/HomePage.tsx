import { useState } from 'react';
import BackPage from "./BackPage";

function ContentBlock({ showNext, isTransitioning, handleStart }: { showNext: boolean, isTransitioning: boolean, handleStart: () => void }) {
  return (<div className="relative w-full h-full flex items-center justify-center">
    {!showNext && (
      <div
        id="initial"
        className={`transition-all duration-600 ease-in-out
              ${isTransitioning ? 'opacity-0 -translate-y-16 grayscale' : 'opacity-100 translate-y-0'}
              bg-white/80 rounded-xl shadow-lg p-8`}
        style={{
          transition: 'all 3s cubic-bezier(.4,0,.2,1)',
        }}
      >
        <h1 style={{
          fontSize: 'clamp(1.5rem, 4vw, 3rem)',
          whiteSpace: 'nowrap',
        }}>
          欢迎来到故事的起点
        </h1>
        <div style={{
          fontSize: 'clamp(0.75rem, 2vw, 1.5rem)',
          whiteSpace: 'nowrap',
        }}>
          <p>情节的走向将在此时确定</p>
          <button
            onClick={handleStart}
            className="mt-6 px-6 py-2 bg-yellow-600 text-purple-950 font-semibold rounded-lg hover:bg-yellow-700 transition"
          >
            开始故事接龙
          </button>
        </div>
      </div>
    )}
    {showNext && (
      <div
        className="transition-all duration-600 ease-in-out opacity-0 animate-fadein
              absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
              bg-white/90 rounded-xl shadow-lg p-8"
        style={{
          animation: 'fadein 0.6s forwards',
        }}
      >
        {/* 新的内容块 */}
        <h2 className="text-2xl font-bold mb-4">新的内容块</h2>
        <p>这里是新浮现的内容。</p>
      </div>
    )}
  </div>
  );
}

function HomePage() {
  const [showNext, setShowNext] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleStart = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setShowNext(true);
      setIsTransitioning(false);
    }, 600); // 动画时长与CSS一致
  };

  return (
    <BackPage>
      <ContentBlock showNext={showNext} isTransitioning={isTransitioning} handleStart={handleStart} />
    </BackPage>
  );
}

export default HomePage;