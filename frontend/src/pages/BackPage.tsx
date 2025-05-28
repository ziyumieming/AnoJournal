import './BackPage.css'
import CitySvg from '../assets/city.svg'
import StarSvg from '../assets/star.svg'
import { useEffect, useRef, useState } from 'react';
import AdvancedParticleSystem from '../components/Cursor1'; // 引入粒子系统类
import MeteorMouseEffect from '../components/Cursor2';

function BackPage() {
  const bigStarRef = useRef<HTMLImageElement>(null);
  const cursor1Ref = useRef<any>(null);
  const cursor2Ref = useRef<any>(null);
  const isMeteorActiveRef = useRef(false);

  useEffect(() => {
    cursor2Ref.current = new MeteorMouseEffect('particleCanvas1', 'particleArea');
    cursor1Ref.current = new AdvancedParticleSystem('particleCanvas2', 'particleArea');

    cursor1Ref.current?.setActive(true);
    cursor2Ref.current?.setActive(false);

    const overlay = document.getElementById('particleOverlay');
    const star = bigStarRef.current;
    if (!overlay || !star) return;

    let lastTime = 0;
    const handleMove = (e: MouseEvent) => {
      const now = Date.now();
      const rect = star.getBoundingClientRect();
      if (now - lastTime < 32) return;
      lastTime = now;
      const shrinkX = rect.width * 0.2 / 2;
      const shrinkY = rect.height * 0.2 / 2;
      const innerLeft = rect.left + shrinkX;
      const innerRight = rect.right - shrinkX;
      const innerTop = rect.top + shrinkY;
      const innerBottom = rect.bottom - shrinkY;
      const inStar =
        e.clientX >= innerLeft &&
        e.clientX <= innerRight &&
        e.clientY >= innerTop &&
        e.clientY <= innerBottom;

      if (inStar) {
        star.classList.add('big-star-hover');
        if (!isMeteorActiveRef.current) {
          isMeteorActiveRef.current = true;
          cursor1Ref.current?.setActive(false);
          cursor2Ref.current?.setActive(true);
          console.log("切换到 Cursor2");
        }
      } else {
        star.classList.remove('big-star-hover');
        if (isMeteorActiveRef.current) {
          isMeteorActiveRef.current = false;
          cursor1Ref.current?.setActive(true);
          cursor2Ref.current?.setActive(false);
          console.log("切换到 Cursor1");
        }
      }
    };

    const handleLeave = () => {
      star.classList.remove('big-star-hover');
      if (isMeteorActiveRef.current) {
        isMeteorActiveRef.current = false;
        cursor1Ref.current?.setActive(true);
        cursor2Ref.current?.setActive(false);
      }
    };

    overlay.addEventListener('mousemove', handleMove);
    overlay.addEventListener('mouseleave', handleLeave);

    return () => {
      overlay.removeEventListener('mousemove', handleMove);
      overlay.removeEventListener('mouseleave', handleLeave);
      cursor1Ref.current?.destroy?.();
      cursor2Ref.current?.destroy?.();
    };
  }, []);

  return (
    <div id="particleArea" className="background">
      {/* 捕获鼠标事件的透明层 */}
      <div id="particleOverlay" className="particle-overlay">

        {/* 粒子系统的画布 */}
        <canvas id="particleCanvas1" className="particle-canvas"></canvas>
        <canvas id="particleCanvas2" className="particle-canvas"></canvas>
      </div>

      {/* 星星 */}
      <div className="top-stars-container">
        {[...Array(10)].map((_, i) => (
          <img
            key={i}
            src={StarSvg}
            alt="Star"
            className="top-star"
          />
        ))}
      </div>

      {/* 星空：小白点模拟 */}
      <div className="stars-container">
        {[...Array(80)].map((_, i) => (
          <div
            key={i}
            className="star"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* 大星星 */}
      <div className="big-star-container">
        <img ref={bigStarRef} src={StarSvg} alt="Star" className="big-star" />
      </div>

      {/* 页面主内容（居中） */}
      <div className="content">
        <div className="text-container">
          <h1 className="title">匿名</h1>
          <p className="subtitle">在夜色中书写，只为被听见</p>
        </div>
      </div>

      {/* 城市 */}
      <div className="city-container">
        <img src={CitySvg} alt="City" className="city-bottom" />
      </div>

    </div>
  );
}

export default BackPage;