import styles from './BackPage.module.css'
import CitySvg from '../assets/img/city-night.svg'
import StarSvg from '../assets/img/star.svg'
import { useEffect, useRef } from 'react';
import AdvancedParticleSystem from '../components/Cursor1'; // 引入粒子系统类
import MeteorMouseEffect from '../components/Cursor2';

function BackPage() {
  const bigStarRef = useRef<HTMLImageElement>(null);
  const cursor1Ref = useRef<any>(null);
  const cursor2Ref = useRef<any>(null);
  const isMeteorActiveRef = useRef(false);
  const topStarRefs = useRef<(HTMLImageElement | null)[]>([]);


  useEffect(() => {
    cursor2Ref.current = new MeteorMouseEffect('particleCanvas1', 'particleArea');
    cursor1Ref.current = new AdvancedParticleSystem('particleCanvas2', 'particleArea');

    cursor1Ref.current?.setActive(true);
    cursor2Ref.current?.setActive(false);

    const overlay = document.getElementById('particleOverlay');
    const bigStar = bigStarRef.current;
    if (!overlay || !bigStar) return;

    let lastTime = 0;
    const handleMove = (e: MouseEvent) => {
      const now = Date.now();
      // 大星星的悬停检测
      const bigStarRect = bigStar.getBoundingClientRect();
      if (now - lastTime < 64) return; // 节流，约15fps
      lastTime = now;
      const shrinkX = bigStarRect.width * 0.2 / 2;
      const shrinkY = bigStarRect.height * 0.2 / 2;
      const innerLeft = bigStarRect.left + shrinkX;
      const innerRight = bigStarRect.right - shrinkX;
      const innerTop = bigStarRect.top + shrinkY;
      const innerBottom = bigStarRect.bottom - shrinkY;
      const inBigStar =
        e.clientX >= innerLeft &&
        e.clientX <= innerRight &&
        e.clientY >= innerTop &&
        e.clientY <= innerBottom;

      if (inBigStar) {
        bigStar.classList.add(styles.bigStarHover);
        if (!isMeteorActiveRef.current) {
          isMeteorActiveRef.current = true;
          cursor1Ref.current?.setActive(false);
          cursor2Ref.current?.setActive(true);
        }
      } else {
        bigStar.classList.remove(styles.bigStarHover);
        if (isMeteorActiveRef.current) {
          isMeteorActiveRef.current = false;
          cursor1Ref.current?.setActive(true);
          cursor2Ref.current?.setActive(false);
        }
      }

      // 顶部星星的悬停检测
      topStarRefs.current.forEach(starEl => {
        if (starEl) {
          const starRect = starEl.getBoundingClientRect();
          const inStar =
            e.clientX >= starRect.left &&
            e.clientX <= starRect.right &&
            e.clientY >= starRect.top &&
            e.clientY <= starRect.bottom;

          if (inStar) {
            starEl.classList.add(styles.topStarHover);
          } else {
            starEl.classList.remove(styles.topStarHover);
          }
        }
      });
    };

    const handleLeave = () => {
      bigStar.classList.remove(styles.bigStarHover);
      if (isMeteorActiveRef.current) {
        isMeteorActiveRef.current = false;
        cursor1Ref.current?.setActive(true);
        cursor2Ref.current?.setActive(false);
      }
      topStarRefs.current.forEach(starEl => {
        starEl?.classList.remove(styles.topStarHover);
      });
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
    <div id="particleArea" className={styles.background}>
      {/* 捕获鼠标事件的透明层 */}
      <div id="particleOverlay" className={styles.particleOverlay}>
        {/* 粒子系统的画布 */}
        <canvas id="particleCanvas1" className={styles.particleCanvas}></canvas>
        <canvas id="particleCanvas2" className={styles.particleCanvas}></canvas>
      </div>

      {/* 星星 */}
      <div className={styles.topStarsContainer}>
        {[...Array(15)].map((_, i) => {
          const randomMarginLeft = Math.random() * 40 - 20; // 水平偏移量
          const randomMarginTop = Math.random() * 40; // 距离顶部偏移量
          const randomRotation = Math.random() * 360; // 随机旋转角度
          const randomHoverRotation = Math.random() * 35 + 20; // 悬停时的随机旋转角度

          return (
            <img key={i} ref={el => { topStarRefs.current[i] = el; }} src={StarSvg} alt="Star" className={styles.topStar} style={{
              marginLeft: `${randomMarginLeft}px`, marginTop: `${randomMarginTop}px`,
              '--initial-star-rotation': `${randomRotation}deg`, '--hover-added-rotation': `${randomHoverRotation}deg`,  // 设置悬停时的随机旋转角度
            } as React.CSSProperties}
            />
          );
        })}
      </div>

      {/* 星空：小白点模拟 */}
      <div className={styles.starsContainer}>
        {[...Array(80)].map((_, i) => (
          <div
            key={i}
            className={styles.star}
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* 大星星 */}
      <div className={styles.bigStarContainer}>
        <img ref={bigStarRef} src={StarSvg} alt="Star" className={styles.bigStar} />
      </div>

      {/* 页面主内容（居中） */}
      <div className={styles.content}>
        <div className={styles.textContainer}>
          <h1 className={styles.title}>匿名</h1>
          <p className={styles.subtitle}>在夜色中书写，只为被听见</p>
        </div>
      </div>

      {/* 城市 */}
      <div className={styles.cityContainer}>
        <img src={CitySvg} alt="City" className={styles.cityBottom} />
      </div>

    </div>
  );
}

export default BackPage;