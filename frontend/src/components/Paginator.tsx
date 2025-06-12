import { useState } from 'react';

interface ContentPaginatorProps {
    contents: string[];
    className?: string;
    style?: React.CSSProperties;
}

function ContentPaginator({ contents, className = '', style = {} }: ContentPaginatorProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const goToPrevious = () => {
        setCurrentIndex(prev => prev > 0 ? prev - 1 : contents.length - 1);
    };

    const goToNext = () => {
        setCurrentIndex(prev => prev < contents.length - 1 ? prev + 1 : 0);
    };

    if (contents.length === 0) {
        return null;
    }

    return (
        <div
            className={className}
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                ...style
            }}
        >
            {/* 内容区域 */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: '50px',
                    overflow: 'auto',
                    padding: '1rem',
                    backgroundColor: 'transparent', // 透明背景
                    // 隐藏滚动条但保持滚动功能
                    scrollbarWidth: 'none', // Firefox
                    msOverflowStyle: 'none', // IE/Edge
                }}
                className="[&::-webkit-scrollbar]:hidden" // Chrome/Safari/WebKit
            >
                <p style={{
                    lineHeight: '1.6',
                    textAlign: 'justify',
                    wordBreak: 'break-word',
                    fontSize: 'clamp(0.875rem, 2vw, 1.125rem)',
                    margin: 0,
                    width: '100%',
                    color: 'white' // 白色文字
                }}>
                    {contents[currentIndex]}
                </p>
            </div>

            {/* 控制区域 */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 1rem',
                    backgroundColor: 'transparent', // 透明背景
                    border: 'none' // 移除边框
                }}
            >
                {/* 页码指示器 */}
                <div
                    className="text-xs"
                    style={{ color: 'white' }} // 白色文字
                >
                    {contents.length > 1 ? `${currentIndex + 1} / ${contents.length}` : ''}
                </div>

                {/* 导航按钮 */}
                {contents.length > 1 && (
                    <div className="flex gap-2">
                        <button
                            onClick={goToPrevious}
                            className="w-8 h-8 bg-yellow-600 hover:bg-yellow-700 text-purple-950 rounded-full flex items-center justify-center transition-colors duration-200"
                            aria-label="上一页"
                        >
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="currentColor"
                                className="transform rotate-180"
                            >
                                <path d="M6 9L2 5h8L6 9z" />
                            </svg>
                        </button>

                        <button
                            onClick={goToNext}
                            className="w-8 h-8 bg-yellow-600 hover:bg-yellow-700 text-purple-950 rounded-full flex items-center justify-center transition-colors duration-200"
                            aria-label="下一页"
                        >
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="currentColor"
                            >
                                <path d="M6 9L2 5h8L6 9z" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ContentPaginator;