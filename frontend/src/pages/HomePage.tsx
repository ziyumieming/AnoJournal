import { useState } from 'react';
import BackPage from "./BackPage";
import ContentPaginator from "../components/Paginator";

function ContentBlock({ showMain, isTransitioning, showHead, handleStart, handleBack }: { showMain: boolean, isTransitioning: boolean, showHead: boolean, handleStart: () => void, handleBack: () => void }) {
  const contentPages = [
    "我一直有一个想法：当我使用中文输入法时，我有时会错误地在英文模式下输入了一些内容，而我实际是想在中文模式下由输入法接受这串字符并联想输入内容。但等我意识到时，我已经错误地将其直接输入到了文本框中，我只能删掉它们，调整成中文模式后重新输入一次。这种错误让我很沮丧。我在考虑，能否实现一个程序，让我可以在选中一串英文并按某个快捷键组合时，将其直接转化到输入法输入中去？你认为这种设想是否可行？",
    "这是第二段内容。在实际应用中，你可以根据需要添加更多的内容段落。每一段都可以包含大量的文字，组件会自动处理换行和布局。",
    "这是第三段内容。通过右下角的三角形按钮，用户可以轻松地在不同的内容段落之间切换，这样可以避免页面内容过长导致的滚动问题。"
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {showHead && (
        <div
          className={`bg-white/80 rounded-xl shadow-lg p-8 w-full max-w-md`}
          style={{
            transition: 'all 3s cubic-bezier(.4,0,.2,1)',
            maxWidth: 400,
            opacity: isTransitioning ? 0 : 1,
            transform: isTransitioning ? 'translateY(-64px)' : 'translateY(0)',
            filter: isTransitioning ? 'grayscale(100%)' : 'grayscale(0%)'
          }}
        >
          <h1 style={{
            fontSize: 'clamp(1.5rem, 4vw, 3rem)',
          }}>
            欢迎来到故事的起点
          </h1>
          <div style={{
            fontSize: 'clamp(0.75rem, 2vw, 1.5rem)',
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
      {showMain && (
        <div
          className="bg-white/90 rounded-xl shadow-lg p-8 w-full max-w-md transition-all duration-600 ease-in-out"
          style={{
            animation: 'fadein 0.6s forwards',
            maxWidth: '90%',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            hyphens: 'auto',
            height: '70vh', // 设置固定高度
            display: 'grid',
            gridTemplateRows: '1fr 4fr 2fr 1fr', // 1/8, 4/8(1/2), 2/8(1/4), 1/8
            gap: '0.5rem'
          }}
        >
          {/* H2 标题区域 - 占据 1/8 */}
          <div
            className="flex items-center justify-center"
            style={{
              gridRow: '1',
              overflow: 'hidden'
            }}
          >
            <h2
              className="text-center font-semibold"
              style={{
                fontSize: 'clamp(1rem, 3vw, 1.5rem)',
                lineHeight: '1.2',
                margin: 0
              }}
            >
              新的内容块：这里是新浮现的内容。
            </h2>
          </div>

          {/* ContentPaginator 区域 - 占据 1/2 */}
          <div
            className="flex items-center justify-center"
            style={{
              gridRow: '2',
              overflow: 'hidden'
            }}
          >
            <ContentPaginator
              contents={contentPages}
              className="w-full h-full"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            />
          </div>

          {/* Textarea 区域 - 占据 1/4 */}
          <div
            className="flex items-center justify-center"
            style={{
              gridRow: '3',
              overflow: 'hidden'
            }}
          >
            <textarea
              className="w-full h-full p-2 border border-gray-300 rounded-lg resize-none"
              placeholder="在这里输入你的内容..."
              style={{
                fontSize: 'clamp(0.75rem, 2vw, 1rem)',
                lineHeight: '1.4',
                textAlign: 'justify',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                hyphens: 'auto'
              }}
            />
          </div>

          {/* 按钮区域 - 占据 1/8 */}
          <div
            className="flex items-center justify-center"
            style={{
              gridRow: '4',
              overflow: 'hidden'
            }}
          >
            <button
              onClick={handleBack}
              className="px-6 py-2 bg-yellow-600 text-purple-950 font-semibold rounded-lg hover:bg-yellow-700 transition"
              style={{
                fontSize: 'clamp(0.875rem, 2vw, 1rem)'
              }}
            >
              返回
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HomePage() {
  const [showMain, setshowMain] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showHead, setshowHead] = useState(true);

  const handleStart = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setshowHead(false); // 这里延迟卸载旧内容
      setshowMain(true);
      setIsTransitioning(false);
    }, 2000); // 动画时长
  };

  const handleBack = () => {
    setshowMain(false);
    setshowHead(true);
  };

  return (
    <BackPage>
      <ContentBlock
        showMain={showMain}
        isTransitioning={isTransitioning}
        showHead={showHead}
        handleStart={handleStart}
        handleBack={handleBack}
      />
    </BackPage>
  );
}

export default HomePage;