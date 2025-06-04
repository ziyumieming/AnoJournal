import styles from './BackPage.module.css'
import CitySvg from '../assets/img/city-night.svg'
import StarSvg from '../assets/img/star.svg'
import { useEffect, useRef, type ReactNode } from 'react';
import AdvancedParticleSystem from '../components/Cursor1'; // 引入粒子系统类
import MeteorMouseEffect from '../components/Cursor2';
import React from 'react';
import { useMemo } from 'react';

type Props = {
  children: ReactNode;
};


function BackPage({ children }: Props) {
  const bigStarRef = useRef<HTMLImageElement>(null);
  const cursor1Ref = useRef<any>(null);
  const cursor2Ref = useRef<any>(null);
  const isMeteorActiveRef = useRef(false);
  const topStarRefs = useRef<(HTMLImageElement | null)[]>([]);


  useEffect(() => {
    cursor2Ref.current = new MeteorMouseEffect('particleCanvas1');
    cursor1Ref.current = new AdvancedParticleSystem('particleCanvas2');

    cursor1Ref.current?.setActive(true);
    cursor2Ref.current?.setActive(false);

    const bigStar = bigStarRef.current;
    if (!bigStar) return;

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


    const handleResize = () => {
      cursor1Ref.current?.resizeCanvas?.();
      cursor2Ref.current?.resizeCanvas?.();
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseleave', handleLeave);
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseleave', handleLeave);
      window.removeEventListener('resize', handleResize);
      cursor1Ref.current?.destroy?.();
      cursor2Ref.current?.destroy?.();
    };
  }, []);

  const topStars = useMemo(() => (
    [...Array(15)].map((_, i) => {
      const randomMarginLeft = Math.random() * 40 - 20;
      const randomMarginTop = Math.random() * 40;
      const randomRotation = Math.random() * 360;
      const randomHoverRotation = Math.random() * 35 + 20;
      return {
        randomMarginLeft,
        randomMarginTop,
        randomRotation,
        randomHoverRotation,
      };
    })
  ), []);

  const stars = useMemo(() => (
    [...Array(80)].map((_, i) => ({
      top: Math.random() * 100,
      left: Math.random() * 100,
      animationDuration: 2 + Math.random() * 3,
    }))
  ), []);

  return (
    <div id="particleArea" className={styles.background}>
      <canvas id="particleCanvas1" className={styles.particleCanvas}></canvas>
      <canvas id="particleCanvas2" className={styles.particleCanvas}></canvas>

      {/* 顶部星星 */}
      <div className={styles.topStarsContainer}>
        {topStars.map((star, i) => (
          <img
            key={i}
            ref={el => { topStarRefs.current[i] = el; }}
            src={StarSvg}
            alt="Star"
            className={styles.topStar}
            style={{
              marginLeft: `${star.randomMarginLeft}px`,
              marginTop: `${star.randomMarginTop}px`,
              '--initial-star-rotation': `${star.randomRotation}deg`,
              '--hover-added-rotation': `${star.randomHoverRotation}deg`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* 星空：小白点模拟 */}
      <div className={styles.starsContainer}>
        {stars.map((star, i) => (
          <div
            key={i}
            className={styles.star}
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              animationDuration: `${star.animationDuration}s`
            }}
          />
        ))}
      </div>

      <div className={styles.fixedSidesContainer}>
        {/* 大星星 */}
        <div className={styles.bigStarContainer}>
          <img ref={bigStarRef} src={StarSvg} alt="Star" className={styles.bigStar} />
        </div>

        {/* 页面主内容（居中） */}
        <div className={styles.content}>
          {children ? (
            children
          ) : (
            <div className={styles.textContainer}>
              <h1 className={styles.title}>无言</h1>
              <p className={styles.subtitle}>在夜色中书写，只为被听见</p>
            </div>
          )}
        </div>
      </div>

      {/* 城市 */}
      <div className={styles.cityContainer}>
        <img src={CitySvg} alt="City" className={styles.cityBottom} />
      </div>

    </div>
  );
}

export default React.memo(BackPage);